#!/usr/bin/env node

const shell_channels = ["#!/bin/bash", "#!/bin/sh"];

var irc = require('irc'),
  settings = require('./settings.js'),
  child_process = require('child_process'),
  util = require('util');

console.log = function () {
  process.stdout.write(util.format.apply(util, arguments) + "\n");
};

console.error = function () {
  process.stdout.write(util.format.apply(util, arguments) + "\n");
};


function evalcmd(trigger, command, target, nick) {
  var prefix = "";
  if (nick)
    prefix = nick + ": ";

  // sanitize input
  command = command.replace(/\1/g, "");

  console.log('./evalcmd', trigger, " + ", command)
  var proc = child_process.spawn('./evalcmd', [trigger, command]);
  var prev = "";
  var lines = [];
  proc.stdout.on('data', function (chunk) {
    lines = (prev + chunk).split('\n');
    prev = lines.pop();
    lines.forEach(function (line) {
      client.say(target, prefix + line);
    });
  });
  proc.stdout.on('end', function () {
    if (prev)
      client.say(target, prefix + prev);
  });
  proc.on('close', function (code) {
    console.log(trigger + "# " + command + " # exit code " + code);
  });
}

function timestamp() {
  var d = new Date();
  return [
    ('0' + d.getHours()).slice(-2),
    ('0' + d.getMinutes()).slice(-2),
    ('0' + d.getSeconds()).slice(-2)
  ].join(':');
}

var client = new irc.Client(settings.server, settings.nick, settings.irc);

client.addListener('error', function (err) {
  console.log("error: ", err);
});
function pad(s, n) {
  if (s.length < n)
    s = (new Buffer(n).fill(' ').toString() + s).slice(-n)
  return s;
}
client.addListener('message', function (from, to, message) {
  console.log(timestamp() + " %s <%s> %s", pad(to, 10), pad(from, 10), message);
});
client.addListener('kill', function (nick, reason, channels, message) {
  console.log("kill", nick, reason, channels, message);
});
client.addListener('registered', function (message) {
  if (client.nick !== 'shbot') {
    client.say('nickserv', 'GHOST shbot')
  }

  console.log("registered", message);
});

// client.addListener('notice', function(nick, to, text, message) {
//   console.log(typeof(message))
//   console.log(message)
//     if (nick === 'NickServ' && message.endsWith('has been ghosted')) {
//         client.send('NICK', 'shbot');
//     }
//     console.log("--------")
// });

client.addListener("raw", function (message) {
  switch (message.command) {
    case "900": // You are now logged in as <userName>
      console.log(message.args[3]);
      break;
  }
});

client.addListener("ping", function (server) {
  console.log(server, "ping");
});

client.addListener('message#', function (nick, channel, text, message) {
  if (nick === client.nick)
    return;

  var m;
  if (text === "# botsnack")
    client.say(channel, "Core dumped");
  else if (text === "# botsmack")
    client.say(channel, "Segmentation fault");
  else if (shell_channels.indexOf(channel) !== -1) {
    if (text.match(/^\s*#\s*(.*)/)) {
      return;
    }
    evalcmd('', text, channel, nick);
  }
  else if (m = text.match(/^([^ #]*)# (.*)/)) {
    evalcmd(m[1], m[2], channel, nick);
  }
});


client.addListener('pm', function (nick, text, message) {
  if (nick === client.nick)
    return;

  var m;
  if (text === "# botsnack")
    client.say(nick, "Core dumped");
  else if (text === "# botsmack")
    client.say(nick, "Segmentation fault");
  else if (m = text.match(/^([^ #]*)# (.*)/))
    evalcmd(m[1], m[2], nick);
  else
    evalcmd("", text, nick);
});
