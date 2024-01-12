chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    title: "Clipboard Image to server",
    id: "store",
    contexts: ["all"],
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "store") {
    if (!tab.url.includes("chrome://")) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: processExecute,
      });
    }
  }
});

// background script에서 메시지 수신 및 응답
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "notify") {
    notifiyinExtension(request.success);
    // // 여기에서 content script에서 필요한 데이터를 처리하고 응답을 보냅니다.
    const dataToSend = "Notify Executed~!";
    sendResponse(dataToSend);
  }
});

// 내부함수 notifiy START
function notifiyinExtension(isSuccess) {
  // 중복되지 않는 난수
  let notifyCount = new Date().getTime() + Math.random();
  let notification_id = "notification_id" + notifyCount;

  if (isSuccess) {
    chrome.notifications.create(notification_id, {
      type: "basic",
      title: "Clipboard Image Sharing Success",
      message: "URL copied in your clipboard",
      //icon source https://www.flaticon.com/search?word=image
      iconUrl: "./images/image.png",
    });
  } else {
    chrome.notifications.create(notification_id, {
      type: "basic",
      title: "Clipboard Image Failed",
      message: "try again or contact to developer",
      //icon source https://www.flaticon.com/search?word=image
      iconUrl: "./images/image.png",
    });
  }
  // 내부함수 notify END

  // 일정 시간이 지난 후에 팝업창 닫기
  setTimeout(function () {
    chrome.notifications.clear(notification_id, function () {
      // 팝업창이 닫힌 후에 수행할 작업 추가 가능
    });
  }, 5000); // 5초 후에 닫힘 (5000 밀리초)
}

function processExecute() {
  console.log("process!");

  fetch("https://api.ipify.org?format=json")
    .then((response) => response.json())
    .then((data) => {
      let myIp = `${data.ip}`;

      // 내부함수 ClipboardImageToServer START(background.js에 DOM 조작할 수 있는 부분이랑 아닌부분 구분 필요해서 내부함수로 삽입해야하는듯)
      async function ClipboardImageToServer(myIp) {
        // 내부함수 notifiy START
        function notifiy(isSuccess) {
          // content script에서 background script에 메시지 보내기
          chrome.runtime.sendMessage(
            { action: "notify", success: isSuccess },
            function (response) {
              console.log("Received response from background:", response);
              // 여기에서 받은 응답을 처리하거나 필요한 작업을 수행할 수 있습니다.
            }
          );
        }
        try {
          const dataTransfer = await navigator.clipboard.read();

          // get item from clipboard
          for (const item of dataTransfer) {
            const isImage = item.types.some((type) => type === "image/png");

            if (!isImage) {
              continue;
            }

            // get Blob from clipboardItem
            const blob = await item.getType("image/png");

            let reader = new FileReader();

            reader.onload = function (event) {
              let base64EndcodedArr = event.target.result.split(",");
              let metaDataStr = base64EndcodedArr[0];
              let encodedData = base64EndcodedArr[1];

              fetch(
                "https://script.google.com/macros/s/AKfycbyjITeBrk_4bsGRy9jiczwB-KPoYwOZZxnsrr0hYJpxqPLOWEMjDBo96VsMLHssBwlN/exec",
                {
                  method: "POST",
                  body: JSON.stringify({
                    metaData: metaDataStr,
                    data: encodedData,
                    ip: myIp,
                  }),
                }
              )
                .then((response) => response.json())
                .then((data) => {
                  // 클립보드에 복사하고
                  let sharedLinkUrl = data.link;
                  console.log("링크:" + sharedLinkUrl);
                  // Clipboard API를 사용하여 클립보드에 텍스트 복사
                  navigator.clipboard
                    .writeText(sharedLinkUrl)
                    .then(() => {
                      notifiy(true);
                    })
                    .catch((err) => {
                      notifiy(false);
                      console.error("클립보드 복사 중 에러 발생:", err);
                    });
                })
                .catch((error) => {
                  notifiy(false);
                  console.error("Error calling Google Apps Script:", error);
                });
            };

            reader.readAsDataURL(blob);
            break;
          }
        } catch (error) {
          console.error("clipboard read error:", error);
        }
      }
      // 내부 함수 ClipboardImageToServer END

      ClipboardImageToServer(myIp);
    })
    .catch((error) => console.error("에러 발생:", error));

  console.log("process End!");
}

// // 크롬 익스텐션용 노티피케이션
// function notifiy(isSuccess) {
//   let randomId = new Date().getTime() + Math.random();
//   let notification_id = "notification_id" + randomId;

//   if (isSuccess) {
//     chrome.notifications.create(notification_id, {
//       type: "basic",
//       title: "Clipboard Image Sharing Success",
//       message: "URL copied in your clipboard",
//       //icon source https://www.flaticon.com/search?word=image
//       iconUrl: "./images/image.png",
//     });
//   } else {
//     chrome.notifications.create(notification_id, {
//       type: "basic",
//       title: "Clipboard Image Failed",
//       message: "try again or contact to developer",
//       //icon source https://www.flaticon.com/search?word=image
//       iconUrl: "./images/image.png",
//     });
//   }
//   // 내부함수 notify END

//   // 일정 시간이 지난 후에 팝업창 닫기
//   setTimeout(function () {
//     chrome.notifications.clear(notification_id, function () {
//       // 팝업창이 닫힌 후에 수행할 작업 추가 가능
//     });
//   }, 5000); // 5초 후에 닫힘 (5000 밀리초)
// }

// DOM 안에서 쓰기 근데 알림을 또 일일이 다 허용해줘야함
// function notifiy(isSuccess) {
//   let notifier;

//   if (Notification.permission === "granted") {
//     notifier = new Notification("Notification Title", {
//       body: "Notification Body",
//       icon: "./images/image.png",
//     });

//     // 일정 시간(예: 5초) 후에 알림 닫기
//     setTimeout(() => {
//       notification.close();
//     }, 5000);
//   } else if (Notification.permission !== "denied") {
//     Notification.requestPermission().then((permission) => {
//       if (permission === "granted") {
//         notifier = new Notification("Notification Title", {
//           body: "Notification Body",
//           icon: "./images/image.png",
//         });
//       }

//       // 일정 시간(예: 5초) 후에 알림 닫기
//       setTimeout(() => {
//         notification.close();
//       }, 5000);
//     });
//   }
// }
