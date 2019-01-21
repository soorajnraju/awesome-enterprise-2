// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

var htmlConfig = {
  //No need to close. Can be closed inline. you cant close it on next line.
  autoSelfClosers: {'aw2.get': true, 'module.get': true, 'template.get': true,
  'env.get': true,'query.get_post': true,'query.get_post_terms': true,'query.get_post_meta': true
  ,'query.all_post_meta': true,'query.update_post_status': true,'query.delete_post': true,'query.trash_post': true,
  'query.set_post_terms': true,'query.get_posts': true,'query.get_pages': true,'query.get_term_by': true,
  'query.get_term_meta': true, 'query.insert_term': true, 'query.delete_term': true, 'query.get_terms': true,
  'query.get_comment': true, 'query.get_user_by': true, 'query.get_user_meta': true, 
  'query.get_users': true, 'query.delete_revisions': true, 'query.term_exists': true
},
  //No need to close. Can be closed inline. Can be close on next line.
  implicitlyClosed: {'aw2.set': true, 'module.set': true, 'template.set': true,
  'env.set': true, 'query.get_results': true, 'query.get_var': true, 'query.get_row': true, 'query.get_col': true,
  'query.query': true, 'query.insert_post': true,
  'query.update_post': true, 'query.update_post_meta': true, 'query.delete_post_meta': true,
  'query.add_non_unique_post_meta': true, 'query.wp_query': true, 'query.get_comments': true,
  'query.update_user_meta': true, 'query.users_builder': true, 'query.posts_builder': true, 'query.insert_comment': true
 },
  contextGrabbers: {
    'if.equal': {'if.equal': true},
    'if.not_equal': {'if.not_equal': true},
    'if.greater_equal': {'if.greater_equal': true},
    'if.greater_than': {'if.greater_than': true},
    'if.less_equal': {'if.less_equal': true},
    'if.less_than': {'if.less_than': true},
    'if.whitespace': {'if.whitespace': true},
    'if.not_whitespace': {'if.not_whitespace': true},
    'if.false': {'if.false': true},
    'if.true': {'if.true': true},
    'if.yes': {'if.yes': true},
    'if.no': {'if.no': true},
    'if.not_empty': {'if.not_empty': true},
    'if.empty': {'if.empty': true},
    'if.odd': {'if.odd': true},
    'if.even': {'if.even': true},
    'if.arr': {'if.arr': true},
    'if.not_arr': {'if.not_arr': true},
    'if.str': {'if.str': true},
    'if.not_str': {'if.not_str': true},
    'if.bool': {'if.bool': true},
    'if.not_bool': {'if.not_bool': true},
    'if.greater_than_zero': {'if.greater_than_zero': true},
    'if.num': {'if.num': true},
    'if.not_num': {'if.not_num': true},
    'if.int': {'if.int': true},
    'if.not_int': {'if.not_int': true},
    'if.date_obj': {'if.date_obj': true},
    'if.not_date_obj': {'if.not_date_obj': true},
    'if.obj': {'if.obj': true},
    'if.not_obj': {'if.not_obj': true},
    'if.user_can': {'if.user_can': true},
    'if.user_cannot': {'if.user_cannot': true},
    'if.logged_in': {'if.logged_in': true},
    'if.not_logged_in': {'if.not_logged_in': true},
    'if.request': {'if.request': true},
    'if.not_request': {'if.not_request': true},
    'if.device': {'if.device': true},
    'if.contains': {'if.contains': true},
    'if.not_contains': {'if.not_contains': true},
  },
  doNotIndent: {"pre": true},
  allowUnquoted: true,
  allowMissing: true,
  caseFold: true
}

var xmlConfig = {
  autoSelfClosers: {},
  implicitlyClosed: {},
  contextGrabbers: {},
  doNotIndent: {},
  allowUnquoted: false,
  allowMissing: false,
  allowMissingTagName: false,
  caseFold: true
}

CodeMirror.defineMode("shortcode", function(editorConf, config_) {
  var indentUnit = editorConf.indentUnit
  var config = {}
  var defaults = config_.htmlMode ? htmlConfig : xmlConfig
  for (var prop in defaults) config[prop] = defaults[prop]
  for (var prop in config_) config[prop] = config_[prop]

  // Return variables for tokenizers
  var type, setStyle;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "[") {
        type = stream.eat("/") ? "closeTag" : "openTag";
        state.tokenize = inTag;
        return "tag bracket";
    } else {
      stream.eatWhile(/[^\[]/);
      return null;
    }
  }
  inText.isInText = true;

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == "]" || (ch == "/" && stream.eat("]"))) {
      state.tokenize = inText;
      type = ch == "]" ? "endTag" : "selfcloseTag";
      return "tag bracket";
    } else if (ch == "=") {
      type = "equals";
      return null;
    } else if (ch == "[") {
      state.tokenize = inText;
      state.state = baseState;
      state.tagName = state.tagStart = null;
      var next = state.tokenize(stream, state);
      return next ? next + " tag error" : "tag error";
    } else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      state.stringStartCol = stream.column();
      return state.tokenize(stream, state);
    } else {
      stream.match(/^[^\s\u00a0=[\]\"\']*[^\s\u00a0=[\]\"\'\/]/);
      return "word";
    }
  }

  function inAttribute(quote) {
    var closure = function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
    closure.isInAttribute = true;
    return closure;
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    }
  }
  
  function Context(state, tagName, startOfLine) {
    this.prev = state.context;
    this.tagName = tagName;
    this.indent = state.indented;
    this.startOfLine = startOfLine;
    if (config.doNotIndent.hasOwnProperty(tagName) || (state.context && state.context.noIndent))
      this.noIndent = true;
  }
  function popContext(state) {
    if (state.context) state.context = state.context.prev;
  }
  function maybePopContext(state, nextTagName) {
    var parentTagName;
    while (true) {
      if (!state.context) {
        return;
      }
      parentTagName = state.context.tagName;
      if (!config.contextGrabbers.hasOwnProperty(parentTagName) ||
          !config.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext(state);
    }
  }

  function baseState(type, stream, state) {
    if (type == "openTag") {
      state.tagStart = stream.column();
      return tagNameState;
    } else if (type == "closeTag") {
      return closeTagNameState;
    } else {
      return baseState;
    }
  }
  function tagNameState(type, stream, state) {
    if (type == "word") {
      state.tagName = stream.current();
      setStyle = "tag";
      return attrState;
    } else if (config.allowMissingTagName && type == "endTag") {
      setStyle = "tag bracket";
      return attrState(type, stream, state);
    } else {
      setStyle = "error";
      return tagNameState;
    }
  }
  function closeTagNameState(type, stream, state) {
    if (type == "word") {
      var tagName = stream.current();
      if (state.context && state.context.tagName != tagName &&
          config.implicitlyClosed.hasOwnProperty(state.context.tagName))
        popContext(state);
      if ((state.context && state.context.tagName == tagName) || config.matchClosing === false) {
        setStyle = "tag";
        return closeState;
      } else {
        setStyle = "tag error";
        return closeStateErr;
      }
    } else if (config.allowMissingTagName && type == "endTag") {
      setStyle = "tag bracket";
      return closeState(type, stream, state);
    } else {
      setStyle = "error";
      return closeStateErr;
    }
  }

  function closeState(type, _stream, state) {
    if (type != "endTag") {
      setStyle = "error";
      return closeState;
    }
    popContext(state);
    return baseState;
  }
  function closeStateErr(type, stream, state) {
    setStyle = "error";
    return closeState(type, stream, state);
  }

  function attrState(type, _stream, state) {
    if (type == "word") {
      setStyle = "attribute";
      return attrEqState;
    } else if (type == "endTag" || type == "selfcloseTag") {
      var tagName = state.tagName, tagStart = state.tagStart;
      state.tagName = state.tagStart = null;
      if (type == "selfcloseTag" ||
          config.autoSelfClosers.hasOwnProperty(tagName)) {
        maybePopContext(state, tagName);
      } else {
        maybePopContext(state, tagName);
        state.context = new Context(state, tagName, tagStart == state.indented);
      }
      return baseState;
    }
    setStyle = "error";
    return attrState;
  }
  function attrEqState(type, stream, state) {
    if (type == "equals") return attrValueState;
    if (!config.allowMissing) setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrValueState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    if (type == "word" && config.allowUnquoted) {setStyle = "string"; return attrState;}
    setStyle = "error";
    return attrState(type, stream, state);
  }
  function attrContinuedState(type, stream, state) {
    if (type == "string") return attrContinuedState;
    return attrState(type, stream, state);
  }

  return {
    startState: function(baseIndent) {
      var state = {tokenize: inText,
                   state: baseState,
                   indented: baseIndent || 0,
                   tagName: null, tagStart: null,
                   context: null}
      if (baseIndent != null) state.baseIndent = baseIndent
      return state
    },

    token: function(stream, state) {
      if (!state.tagName && stream.sol())
        state.indented = stream.indentation();

      if (stream.eatSpace()) return null;
      type = null;
      var style = state.tokenize(stream, state);
      if ((style || type) && style != "comment") {
        setStyle = null;
        state.state = state.state(type || style, stream, state);
        if (setStyle)
          style = setStyle == "error" ? style + " error" : setStyle;
      }
      return style;
    },
    /*
    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      // Indent multi-line strings (e.g. css).
      if (state.tokenize.isInAttribute) {
        if (state.tagStart == state.indented)
          return state.stringStartCol + 1;
        else
          return state.indented + indentUnit;
      }
      if (context && context.noIndent) return CodeMirror.Pass;
      if (state.tokenize != inTag && state.tokenize != inText)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      // Indent the starts of attribute names.
      if (state.tagName) {
        if (config.multilineTagIndentPastTag !== false)
          return state.tagStart + state.tagName.length + 2;
        else
          return state.tagStart + indentUnit * (config.multilineTagIndentFactor || 1);
      }
      var tagAfter = textAfter && /^\[(\/)?([\w_:\.-]*)/.exec(textAfter);
      if (tagAfter && tagAfter[1]) { // Closing tag spotted
        while (context) {
          if (context.tagName == tagAfter[2]) {
            context = context.prev;
            break;
          } else if (config.implicitlyClosed.hasOwnProperty(context.tagName)) {
            context = context.prev;
          } else {
            break;
          }
        }
      } else if (tagAfter) { // Opening tag spotted
        while (context) {
          var grabbers = config.contextGrabbers[context.tagName];
          if (grabbers && grabbers.hasOwnProperty(tagAfter[2]))
            context = context.prev;
          else
            break;
        }
      }
      while (context && context.prev && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return state.baseIndent || 0;
    },
    electricInput: /\[\/[\s\w:]+]$/,
    */
    blockCommentStart: "//**",
    blockCommentEnd: "**//",

    configuration: config.htmlMode ? "html" : "shortcode",
    helperType: config.htmlMode ? "html" : "shortcode",

    skipAttribute: function(state) {
      if (state.state == attrValueState)
        state.state = attrState
    }
  };
});

});
