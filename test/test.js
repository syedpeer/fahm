setTimeout(function(){

  $(document).off("mousemove_without_noise");
  chrome.extension.sendRequest({handler: 'translate', word: "ملك"}, function(response) {
    var e = { clientX: $(window).width(), clientY: 0 };
    showPopup(e, TransOver.formatTranslation(response.translation));
  });
  chrome.extension.sendRequest({handler: 'translate', word: "المنظمة"}, function(response) {
    var e = { clientX: 0, clientY: 0 };
    showPopup(e, TransOver.formatTranslation(response.translation));
  });
  chrome.extension.sendRequest({handler: 'translate', word: "املاك"}, function(response) {
    var e = { clientX: 0, clientY: 250 };
    showPopup(e, TransOver.formatTranslation(response.translation));
  });
  chrome.extension.sendRequest({handler: 'translate', word: "ابنكما"}, function(response) {
    var e = { clientX: 400, clientY: 0 };
    showPopup(e, TransOver.formatTranslation(response.translation));
  });
  chrome.extension.sendRequest({handler: 'translate', word: "اسمه"}, function(response) {
    var e = { clientX: 400, clientY: 850 };
    showPopup(e, TransOver.formatTranslation(response.translation));
  });

}, 500);
