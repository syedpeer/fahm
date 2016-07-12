RegExp.quote = function(str) {
  return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-79560349-4']);
_gaq.push(['_trackPageview']);

var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
ga.src = 'https://ssl.google-analytics.com/ga.js';
var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);

var _toAbjad = {">":"أ", "<": "إ", "|": "آ", "A": "ا", "b": "ب", "t": "ت", "v": "ث", "j": "ج",
        "H": "ح", "x": "خ", "d": "د", "*": "ذ", "r": "ر", "z": "ز", "s": "س",
        "$": "ش", "S": "ص", "D": "ض", "T": "ط", "Z": "ظ", "E": "ع", "g": "غ",
        "f": "ف", "q": "ق", "k": "ك", "l": "ل", "m": "م", "n": "ن", "h": "ه",
        "w": "و", "y": "ي", "'": "ء", "a": "َ", "i": "ِ", "u": "ُ", "~": "ّ", "o": "ْ", "p": "ة",
        "}": "ئ", "Y": "ى", "&": "ؤ", "K": "ٍ", "F": "ً", "`": "ـٰ"};
var _toABC = {};
for (var key in _toAbjad) {
  if (_toAbjad.hasOwnProperty(key)) {
     _toABC[_toAbjad[key]] = key;
  }
}
_toAbjad['{'] = "ا";
function toABC(str, backward) {
    var lookUpTable = backward ? _toAbjad : _toABC;
    abcString = "";
    for(var i = 0; i < str.length; i++) {
        var newChar = lookUpTable[str[i]];
        if (typeof newChar !== "undefined") {
            abcString += newChar;
        } else {
            console.warn("Unknown char: " + str[i]);
        }
    }
    return abcString;
}
function getStem(abcStem) {
  var stem = "";
  for (var i = 0; i < abcStem.length; i++) {
    stem += toABC(abcStem[i], true);
    if ( i !== abcStem.length - 1) {
      stem += " ";
    }
  }
  return stem;
}
var dictionary = [];
$.get(chrome.extension.getURL('/data/stems.x'), function(_dictionary) {
    var inputArray = _dictionary.split('\n');
    for (var i = 0; i < inputArray.length; i++) {
      var line = inputArray[i];
      if (line.length !== 0 && !line.startsWith(";")) {
        var parts = line.split("\t");
        if (parts.length >= 10) {
          dictionary.push({
            "arabic": toABC(parts[1], true),
            "vocalized": toABC(parts[2], true),
            "translation": parts[5].startsWith('"') ? parts[5].substring(1, parts[5].length - 1) : parts[5],
            "type-code": parts[7],
            "type-human": parts[8].startsWith('"') ? parts[8].substring(1, parts[8].length - 1) : parts[8],
            "stem": getStem(parts[10])
          });
        } else {
          console.warn("Uncomplete entry line " + i);
        }
      }
    }
});


function findInDatabase(word, result, options, done) {
    console.log("Looking for: " + word);
    var filteredArray = dictionary.filter(function (row) {
      if (options.verbImperfect) {
        return row.arabic === word && row['type-code'] === "VERB_IMPERFECT";
      } else if (options.el || options.ah || options.aat) {
        return row.arabic === word && (row['type-code'] === "NOUN" || row['type-code'] === "ADJ");
      } else {
        return row.arabic === word;
      }
    });
    for (var i = 0; i < filteredArray.length; i++) {
        var entry = $.extend(true, {}, filteredArray[i]);
        entry.options = options;
        result.push(entry);
    }
    // Remove prefixes / suffixes
    if (word.startsWith("و") && !options.wa) {
        options.wa = true;
        findInDatabase(word.substring(1), result, options, done);
    } else if (word.startsWith("ل" && !options.li)) {
        options.li = true;
        findInDatabase(word.substring(1), result, options, done);
    } else if (word.startsWith("ب") && !options.bi) {
        options.bi = true;
        findInDatabase(word.substring(1), result, options, done);
    } else if (word.startsWith("ي") && !options.verb) {
        options.ya = true;
        options.verbImperfect = true;
        findInDatabase(word.substring(1), result, options, done);
    } else if (word.startsWith("ت") && !options.verb) {
        options.ta = true;
        options.verbImperfect = true;
        findInDatabase(word.substring(1), result, options, done);
    } else if (word.startsWith("س") && !options.verb) {
        options.sa = true;
        options.verbImperfect = true;
        findInDatabase(word.substring(1), result, options, done);
    } else if (word.startsWith("ال") && !options.el) {
        options.el = true;
        findInDatabase(word.substring(2), result, options, done);
    } else if (word.endsWith("ة")) {
        options.ah = true;
        findInDatabase(word.substring(0, word.length - 1), result, options, done);
    } else if (word.endsWith("ات")) {
        options.aat = true;
        findInDatabase(word.substring(0, word.length - 2), result, options, done);
    } else {
        done(result);
    }
}
function translate(word, ga_event_name, done) {
  // FIXME Translate this word by hitting the database
  findInDatabase(word, [], {}, function(result) {
      if (result.length === 0) {
          done("No result for " + word);
      } else {
          done(result);
      }
  })
}

function figureOutSlTl(tab_lang) {
  var res = {};

  if (Options.target_lang() == tab_lang && Options.reverse_lang()) {
    res.tl = Options.reverse_lang();
    res.sl = Options.target_lang();
    console.log('reverse translate into: ', {tl: res.tl, sl: res.sl});
  }
  else {
    res.tl = Options.target_lang();
    res.sl = Options.from_lang();
    console.log('normal translate into:', {tl: res.tl, sl: res.sl});
  }

  return res;
}

function on_translation_response(data, word, tl, last_translation, sendResponse, ga_event_name) {
  var output, translation = {tl: tl};

  console.log('raw_translation: ', data);

  if (!data.dict && !data.sentences ||
    (data.sentences && data.sentences[0].trans.match(new RegExp(TransOver.regexp_escape(word), 'i')))) {

    translation.succeeded = false;

    if (data.src == tl || Options.do_not_show_oops()) {
      output = '';
    }
    else {
      output = 'Oops.. No translation found.';
    }
  }
  else {
    translation.succeeded = true;
    translation.word = word;

    output = [];
    if (data.dict) { // full translation
      data.dict.forEach(function(t) {
          output.push({pos: t.pos, meanings: t.terms});
      });
    } else { // single word or sentence(s)
      data.sentences.forEach(function(s) {
          output.push(s.trans)
      })
      output = output.join(" ")
    }

    translation.sl = data.src;
  }

  if (! output instanceof String) {
    output = JSON.stringify(output);
  }

  translation.translation = output;

  $.extend(last_translation, translation);

  _gaq.push(['_trackEvent', ga_event_name, translation.sl, translation.tl]);

  console.log('response: ', translation);
  sendResponse(translation);
}

var last_translation = {};

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    switch (request.handler) {
      case 'get_last_tat_sl_tl':
      console.log('get_last_tat_sl_tl');
      sendResponse({last_tl: localStorage['last_tat_tl'], last_sl: localStorage['last_tat_sl']});
      break;
      case 'get_options':
      sendResponse({
          options: JSON.stringify({
              except_urls: Options.except_urls(),
              target_lang: Options.target_lang(),
              reverse_lang: Options.reverse_lang(),
              delay: Options.delay(),
              word_key_only: Options.word_key_only(),
              selection_key_only: Options.selection_key_only(),
              tts: Options.tts(),
              tts_key: Options.tts_key(),
              popup_show_trigger: Options.popup_show_trigger(),
              translate_by: Options.translate_by()
          })
      });
      break;
      case 'translate':
      console.log("received to translate: " + request.word);
      var arabicWord = true;
      for (var i = 0; i < request.word.length; i++) {
          var charCode = request.word.charCodeAt(i);
          if (charCode < 1536 || charCode > 1791) {
              arabicWord = false;
              console.log("Not arabic char: " + request.word[i]);
              break;
          }
      }

      if (arabicWord) {
          translate(request.word, Options.translate_by(), function(translation) {
              sendResponse({
                  translation: translation
              });
          });
      }
      break;
      case 'tts':
      if (last_translation.succeeded) {
        console.log("tts: " + last_translation.word + ", sl: " + last_translation.sl);
        _gaq.push(['_trackEvent', 'tts', last_translation.sl, last_translation.tl]);

        var msg = new SpeechSynthesisUtterance();
        msg.lang = last_translation.sl;
        msg.text = last_translation.word;
        msg.rate = 0.7;
        speechSynthesis.speak(msg);
      }
      sendResponse({});
      break;
      default:
      console.log("Error! Unknown handler");
      sendResponse({});
    }
});

chrome.browserAction.onClicked.addListener(function(tab) {
    chrome.tabs.sendRequest(tab.id, 'open_type_and_translate');
});

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason == 'install') {
      chrome.tabs.create({url: chrome.extension.getURL('options.html')});
    }
});
