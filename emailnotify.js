// EmailJS Admin Notification - monitors for new corrections
(function() {
  var db = firebase.firestore();
    var prevCount = -1;

      db.collection("family").doc("data").onSnapshot(function(snap) {
          if (!snap.exists) return;
              var data = snap.data();
                  if (!data.corrections) return;
                      var curr = data.corrections.length;
                          if (prevCount >= 0 && curr > prevCount) {
                                var newest = data.corrections[0];
                                      if (newest && newest.status === "pending") {
                                              emailjs.send("service_1yz4ape", "template_bd6h5iu", {
                                                        to_email: "shawnnuffer@yahoo.com",
                                                                  subject: "New Correction — " + (newest.memberName || "Family Tree"),
                                                                            member_name: newest.memberName || "Unknown",
                                                                                      field: newest.field || "N/A",
                                                                                                current_value: newest.current || "(not provided)",
                                                                                                          suggested_value: newest.suggested || "(not provided)",
                                                                                                                    note: newest.note || "(none)",
                                                                                                                              submitted_at: new Date(newest.at).toLocaleString()
                                                                                                                                      }, "8srm7HGXMC3xEYZR3")
                                                                                                                                              .then(function() { console.log("[EmailJS] Admin notified!"); })
                                                                                                                                                      .catch(function(e) { console.error("[EmailJS] Error:", e); });
                                                                                                                                                            }
                                                                                                                                                                }
                                                                                                                                                                    prevCount = curr;
                                                                                                                                                                      });
                                                                                                                                                                      })();
