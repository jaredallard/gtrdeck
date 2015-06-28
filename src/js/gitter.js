/**
 * Javascript API Wrapper for gitter.im.
 *
 * @author RainbowDashDC <rainbowdashdc@mezgrman.de> (Jared Allard)
 * @version 0.1.1
 * @license MIT
 *
 * @class gitter
 */
function gitter() {
  // Specific data for the object on construct
  this.localSettings = {}
  this.localSettings.values = {}
  this.apiurl = "https://api.gitter.im/";

  // user options
  this.localSettings.values.access_token = '<snip>';
  this.localSettings.values.loggedin = true;
}

/**
 * Make a request with our headers
 *
 * @param {string} method - HTTP Method i.e POST, GET
 * @param {string} endpoint - https://api.gitter.im/.../... API endpoint!
 * @param {object} options - options for request
 * @memberOf gitter
 */
gitter.prototype.request = function (method, endpoint, options) {
  /* Setup headers */
  var _headers = {
      'Authorization': 'Bearer ' + this.localSettings.values.access_token,
      'Accept':        'application/json'
    },
    _data = {},
    _url = this.apiurl + endpoint;

  // worked for get
  _url = _url+"?access_token="+this.localSettings.values.access_token;

  // Include the data request if told too.
  if (typeof (options.params) === "object") {
    _data = options.params;
    _headers['Content-Type'] = 'application/json';
  }

  if (options.url !== undefined) {
    _url = options.url + endpoint;
  }

  // data
  if(_data) {
    console.log(_data);
    _data = JSON.stringify(_data);
  } else {
    _data = undefined;
  }

  console.log("Request to " + endpoint);
  console.log(options);
  console.log(method + " " + _url);

  console.log(_headers);

  /* Make AJAX request */
  var result = $.ajax(_url, {
    method: method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    data: _data
  });

  // callbacks
  result
    .then(function(data) {
        options.success(data);
    })
    /*.catch(function(err) {
        options.error(err);
    });*/
};

/*
 * Symlink to this.request.
 *
 * @params {string} endpoint - endpoint of API
 * @params {object} params - options
 * @memberOf gitter
 */
gitter.prototype.get = function (endpoint, params) {
  this.request("GET", endpoint, params);
};

/*
 * Symlink to this.request.
 *
 * @params {string} endpoint - endpoint of API
 * @params {object} params - options
 * @memberOf gitter
 */
gitter.prototype.post = function (endpoint, params) {
  this.request("POST", endpoint, params);
};

/*
 * Finalizes oAuth action after we were called.
 * @memberOf gitter
 * @return {bool} success
 */
gitter.prototype.init = function (cb) {
  function getUrlParams(url) {
    // http://stackoverflow.com/a/23946023/2407309
    if (typeof url === 'undefined') {
      url = window.location.search;
    }
    url = url.split('#')[0]; // Discard fragment identifier.
    var urlParams = {};
    var queryString = url.split('?')[1];
    if (!queryString) {
      if (url.search('=') !== false) {
        queryString = url;
      }
    }
    if (queryString) {
      var keyValuePairs = queryString.split('&');
      for (var i = 0; i < keyValuePairs.length; i++) {
        var keyValuePair = keyValuePairs[i].split('=');
        var paramName = keyValuePair[0];
        var paramValue = keyValuePair[1] || '';
        urlParams[paramName] = decodeURIComponent(paramValue.replace(/\+/g, ' '));
      }
    }
    return urlParams;
  }

  /* strip the code response from the earlier oauth response */
  var code = getUrlParams(this.codeStr).code;
  this.code = code;
  this.atcb = cb;

  // Link this to that for external this objects.
  var that = this;

  /* perform oAuth request for access_token */
  this.post("oauth/token", {
    url: "https://gitter.im/login/",
    success: function (d) { /* data, opt textStatus */
      that.addTokens(d);
    },
    error: function (j, s, e) {
      console.log("e: " + s + " / " + e);
    },
    params: {
      client_id: this.client_id,
      client_secret: this.client_secret,
      code: this.code,
      redirect_uri: this.redirect_uri,
      grant_type: 'authorization_code'
    },
    auth: false
  });
};

/*
 * Internal callback to save the tokens.
 * @memberOf gitter
 */
gitter.prototype.addTokens = function (resp) {
  // save state
  this.localSettings.values.access_token = resp.access_token;
  this.localSettings.values.loggedin = true;

  // call our callback
  this.atcb();
};

/**
 * Logs the currently loggedin user out
 * @memberOf gitter
 */
gitter.prototype.logout = function () {
  this.localSettings.values.loggedin = false; // one line
};

/*
 * Get users subscribed rooms
 *
 * @memberOf gitter
 * @callback cb - Callback
 */
gitter.prototype.rooms = function (cb) {
  this.request("GET", "v1/rooms", {
    success: function (data) {
      cb(data);
    },
    error: function (j, s, e) {
      cb(null, { jqXHR: j, textStatus: s, errorThrown: e });
    },
    auth: false
  });
};

/**
 * Attempt to get messages from a room
 *
 * @param {string} roomId - id of room
 * @param {integer} limit - limit of messages to get
 * @param {function} cb - callback to excute on error/success
 * @param {string} beforeId - before id of messages. optional
 *
 * @memberOf gitter
 */
gitter.prototype.messages = function (roomId, limit, cb, beforeId) {
  // Setup _params
  var _params = {};
  _params.limit = limit;

  // include beforeId if it was defined.
  if (beforeId !== undefined) {
    _params.beforeId = beforeId;
  }

  /* Initiate the request */
  this.get("v1/rooms/" + roomId + '/chatMessages', {
    success: function (data) {
      cb(data);
    },
    error: function (j, s, e) {
      cb(null, { jqXHR: j, textStatus: s, errorThrown: e });
    },
    params: _params
  });
};

/**
 * Get an object of the current user who is logged in.
 *
 * @memberOf gitter
 * @param {function} cb - callback function on error/success
 */
gitter.prototype.whoami = function (cb) {
  this.request("GET", "v1/user", {
    success: function (data) {
      cb(data);
    },
    error: function (j, s, e) {
      cb(null, { jqXHR: j, textStatus: s, errorThrown: e });
    }
  });
};

/**
 * Post a message to a room from currently logged in user
 *
 * @memberOf gitter
 * @param {string} rid - id of room
 * @param {string} text - text to post
 * @param {function} cb - callback on error/success
 */
gitter.prototype.sendMessage = function (rid, text, cb) {
  return this.post('v1/rooms/' + rid + '/chatMessages', {
    success: function (data) {
      cb(data);
    },
    error: function (j, s, e) {
      cb(null, { jqXHR: j, textStatus: s, errorThrown: e });
    },
    params: {
      text: text
    }
  });
};
