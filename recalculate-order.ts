const getApiUrl = () =>
  "https://ov9xqk2ey8.execute-api.ap-southeast-1.amazonaws.com/default/bt_json";

const userbranch = "BTKL";

function updateDistanceCalculation(groupId: string) {
  let groupid = groupId;
  // Get new order group coordinates
  let command = {};
  command["command"] = "get_new_order_group_lat_and_longitude";
  command["group_id"] = groupid;

  fetch(getApiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Get Coordinates Response:", data);
      let coordinates = [];
      data.message.sort((a, b) => a.waypoint_sort - b.waypoint_sort);
      data.message.forEach(function (order) {
        coordinates.push(
          order.shipping_longitude + "," + order.shipping_latitude,
        );
        console.log("coordinates", coordinates);
      });

      // Get starting point based on branch
      let startPoint = "";
      if (userbranch === "BTKL" || userbranch === "BTHQ") {
        startPoint = "101.6311912241768,3.100074932257126";
      } else if (userbranch === "BTPG") {
        startPoint = "100.3072658856361,5.441300157839725";
      } else if (userbranch === "BTJ-TEB") {
        startPoint = "103.7528887953979,1.5313824248734436";
      }

      let osrmUrl =
        "https://ov9xqk2ey8.execute-api.ap-southeast-1.amazonaws.com/default/osrm-new/" +
        startPoint +
        ";" +
        coordinates.join(";") +
        "?overview=false&alternatives=true&steps=false&hints=%3B";

      console.log("OSRM URL:", osrmUrl);

      fetch(osrmUrl)
        .then((response) => response.json())
        .then((osrmData) => {
          console.log("OSRM Response:", osrmData);

          osrmData.routes[0].legs.forEach((leg, index) => {
            let distance = (leg.distance / 1000).toFixed(2);
            console.log(`Distance for leg ${index + 1}:`, distance + " km");

            command = {};
            command["command"] = "update_delivery_distance";
            command["order_id"] = data.message[index].order_id;
            command["distance"] = distance;

            console.log(command);

            fetch(getApiUrl(), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(command),
            })
              .then((response) => response.json())
              .then((response) => {
                console.log(
                  `Update Delivery Distance Response for leg ${index + 1}:`,
                  response,
                );
              })
              .catch((error) => {
                console.log(
                  `Update Delivery Distance Error for leg ${index + 1}:`,
                  error,
                );
              });
          });

          // Update total mileage for group
          command = {};
          command["command"] = "update_new_mileage_for_group";
          command["group_id"] = groupid;
          command["new_mileage"] = (osrmData.routes[0].distance / 1000).toFixed(
            2,
          );

          console.log(command);

          fetch(getApiUrl(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(command),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log("Update Mileage Response:", command["new_mileage"]);
              console.log("Mileage updated: " + command["new_mileage"] + " km");
            })
            .catch((error) => {
              console.log("Update Mileage Error:", error);
              console.log("Failed to update mileage. Please try again.");
            });
        })
        .catch((error) => {
          console.log("OSRM Error:", error);
          console.log("Failed to get new mileage. Please try again.");
        });
    })
    .catch((error) => {
      console.log("Get Coordinates Error:", error);
      console.log("Failed to get coordinates. Please try again.");
    });
}

updateDistanceCalculation("A09365L413");
