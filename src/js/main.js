/**
 * gtrdeck js
 **/

page.register({
  name: "login",
  onBack: false,
  init: function() {
    $("article[page=login]").show();
  },
  exit: function() {
    $("article[page=login]").hide();
  },
  nav: true,
  back: false
})

// index "tab" page.
page.register({
  name: "index",
  onBack: false,
  init: function() {
    $("html,body").attr("style", "background-image:none !important;background-color: #444448 !important;");
    $("article[page=index]").show();

    var rid  = '5531927915522ed4b3df2d92',
        img  = 'https://avatars.githubusercontent.com/TARDIX',
        name = "TARDIX/Dev";

    // stream
    console.log(localStorage.getItem("access_token").replace(/\ /g, "").replace("	", ""))
    initFaye(localStorage.getItem("access_token").replace(/\ /g, "").replace("	", ""))

    // Generate the Tab, messages, start stream.
    genTab({
      rid: rid,
      name: name,
      img: img
    })

    // time stream
    setInterval(function() {
      $(".sentTime").timeago();
    }, 5000);
  },
  exit: function() {
    $("article[page=index]").hide();
  },
  nav: false,
  back: false
})

function getRoomMessages(rid) {
  gtr.messages(rid, 50, function (data, err) {
    data.forEach(function (v) {
      generateMessage(v, rid);
    });

    // resize hook.
    $(".tab .content-wrapper").height($(".tab").height()-50);

    $(document).ready(function() {
      $('pre code').each(function(i, block) {
        hljs.highlightBlock(block);
      });
    });

    // start message stream
    streamRoom(rid);
  });
}

function generateMessage(v, rid) {
  // precompile the template.
  if(!window.message_template) {
    var source   = $("#messageTemplate").html();
    window.message_template = Handlebars.compile(source);
  }

  var text = marked(v.text)

  // usernames
  text = text.replace(/\@([a-zA-Z]+)/g,
  "<a href='https://github.com/$1' target='__blank'>@$1</a>");

  var name = v.fromUser.displayName.substr(0,17)
  if(name.length===17 && v.fromUser.displayName.length!==17) {
    name = name+" <b>...</b>"
  }

  // handlebars template.
  var s = window.message_template({
    img: v.fromUser.avatarUrlMedium,
    name: name,
    at: v.fromUser.username,
    contents: text,
    sentTime: v.sent,
    sentTimeParsed: $.timeago(v.sent),
    id: v.id
  });

  $("#"+rid+"-content").prepend(s);
  $("#"+rid+"-content").show();
}

function genTab(obj) {
  if(window.tab_template===undefined) { // check if already compilied
    var source          = $("#tabTemplate").html();
    window.tab_template = Handlebars.compile(source);
  }

  // check if tab already exists.
  if(document.getElementById(obj.rid+"-tab")) {
    console.log("[tab] obj: ", document.getElementById(obj.rid+"-tab"))
    console.log("[tab] ignorning request to make new tab, already exists.");
    return false
  }

  var str = "<div class='tabs'><img src='"+obj.img+"' /></div>";
  var comp = window.tab_template(obj);

  console.log("[tab]: new tab", obj)

  $(".tab-wrapper").append(comp);
  $(".tabs-wrapper").append(str);

  // get messages.
  getRoomMessages(obj.rid);
}

function addTabs() {
  // fill room dialog with rooms.
  gtr.rooms(function(data, err) {
    if(!window.room_template) {
      var source   = $("#roomTemplate").html();
      window.room_template = Handlebars.compile(source);
    }

    data.forEach(function(v) {
      var comp = window.room_template({
        id: v.id,
        name: v.name,
        img: "https://avatars.githubusercontent.com" + "/" + v.name.split("/")[0]
      });

      $(".new-tabs").append(comp);
    });

    $(".room").click(function() {
      var roomname = $(this).attr("roomname");
      var roomid = $(this).attr("roomid");
      var roomimg = $(this).attr("roomimg");

      // make the tab.
      genTab({
        rid: roomid,
        name: roomname,
        img: roomimg
      });

      // close the dialog.
      closeTabDialog();
    })
  });

  $(".tab-add-dialog").show();
  $(".dialog-bg").show();
}

function closeTabDialog() {
  $(".tab-add-dialog").hide();
  $(".dialog-bg").hide();
}

function initFaye(token) {
  // Authentication extension
  var ClientAuthExt = function() {};
  ClientAuthExt.prototype.outgoing = function(message, callback) {
    if (message.channel == '/meta/handshake') {
      if (!message.ext) { message.ext = {}; }
      message.ext.token = token;
    }

    callback(message);
  };

  ClientAuthExt.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/handshake') {
      if(message.successful) {
        console.log('Successfuly subscribed to room: ', roomId);
      } else {
        console.log('Something went wrong: ', message.error);
      }
    }

    callback(message);
  };

  // Snapshot extension
  var SnapshotExt = function() {};
  ClientAuthExt.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/subscribe' && message.ext && message.ext.snapshot) {
      console.log('Snapshot: ', message.ext.snapshot);
    }

    callback(message);
  };

  // Faye client
  window.faye_client = new Faye.Client('https://ws.gitter.im/faye', {timeout: 60, retry: 5, interval: 1});

  // Add Client Authentication extension
  window.faye_client.addExtension(new ClientAuthExt());

  // A dummy handler to echo incoming messages
  window.messageHandler = function(msg, rid) {
    if (msg.operation) {
      // new message.
      if(msg.operation === "create") {
        console.log("[message]: ", msg)
        generateMessage(msg.model, rid);
      }
    } else if(msg.notification) {
      console.log("[notification]: ", msg);
    } else {
      console.log("[faye] unregistered type: ", msg);
    }
  };
}

function streamRoom(rid) {
  console.log("[faye] register onto room: ", rid);
  function mh(msg) {
    var _rid = rid;
    messageHandler(msg, _rid)
  }

  window.faye_client.subscribe('/api/v1/rooms/' + rid,                   mh, {});
  window.faye_client.subscribe('/api/v1/rooms/' + rid + '/chatMessages', mh, {});
  window.faye_client.subscribe('/api/v1/rooms/' + rid + '/users',        mh, {});
  window.faye_client.subscribe('/api/v1/rooms/' + rid + '/events',       mh, {});

  console.log("[faye] subscribed.")
}

// check the templates.
if($("#tabTemplate")) {
  console.log("Found a tab template.");
}

if($("#messageTemplate")) {
  console.log("Found a message template.")
}

function doLogin(at) {
  if(localStorage.getItem("access_token")!==undefined
     && localStorage.getItem("access_token")!==''
     && localStorage.getItem("access_token")!=='undefined') {
       page.set('index');
       return false // refuse to run if already set.
  }

  localStorage.setItem("access_token", at);
  gtr.localSettings.values.access_token = localStorage.getItem("access_token");
  page.set('index');
}

// load gitter
gtr = new gitter();

function resize() {
  $(".tab .content-wrapper").height($(".tab").height()-50);
}
$(window).on('resize', resize);

// initial page.
if(localStorage.getItem("access_token")!==undefined
   && localStorage.getItem("access_token")!==''
   && localStorage.getItem("access_token")!=='undefined') {
  var source = $("#helloTemplate").html();
  template   = Handlebars.compile(source);

  gtr.whoami(function(data) {
    data = data[0]
    console.log("[hello] name: ", data.displayName);
    console.log("[whoami]: ", data)
    var comp = template({
      name: data.displayName,
      img: data.avatarUrlMedium
    })

    // add it to the stack
    $(".inner").prepend(comp);

    $(".login-panel").height(270);

    page.set("login");
  })
} else {
  $(".login-panel").height(170);
  $(".login-hello, #access_token").show();
  page.set("login");
}
