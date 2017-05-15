const path = require("path");
const static = require('node-static');


let file = new static.Server(__dirname);

let PORT_STATIC = 8085 || process.argv[2];
let PORT_SOCKET = 8087 || process.argv[3];

let server = require('http').createServer(function(request, response) {
    request.addListener('end', function() {
        file.serve(request, response);
    }).resume();
}).listen(PORT_STATIC);

let WebSocketServer = new require('ws');

let clients = {}; // all web socket clients

var webSocketServer = new WebSocketServer.Server({
    port: PORT_SOCKET
}, console.log('@>peer chat was running on ' + PORT_STATIC));

let { ADMIN_ID } = require(path.join(__dirname, "cfg"));

webSocketServer.on('connection', function(ws) {

    let id = Date.now();
    let is_admin = false;

    try {
        id += ws.upgradeReq.headers.cookie.match(/currentAccount=([a-z,0-9,-]+)/g)[0];
    } catch (err) {
        console.log('@>err cookie')
    }

    try {
        if (ws.upgradeReq.headers["sec-websocket-protocol"] == ADMIN_ID) {
            clients["support"] = ws;
            is_admin = true;
        }
    } catch (err) {
        console.log('@>err protocol')
    }

    !is_admin ? clients[id] = ws : 1;

    console.log("new connect: ", id, is_admin);

    ws.on('message', function(msg) {

        try {
            msg = JSON.parse(msg)
        } catch (err) {
            msg: '{"message":error}'
        }

        console.log('@>message', msg, id, is_admin)

        let client = clients[msg.id || id];

        client && client.send(JSON.stringify({
            id: msg.id ? "support" : id,
            message: clients["support"] ? msg.message : `(support is offline) ${msg.message}`
        }));


        clients["support"] && clients["support"].send(JSON.stringify({
            id: msg.id || id,
            message: msg.message,
            is_admin: msg.id
        }));


    });

    ws.on('close', function() {
        console.log('connection was closed ' + id);

        if (!is_admin && clients["support"]) {
            clients["support"].send(JSON.stringify({
                id,
                message: "/close"
            }));
        }

        delete clients[id];
    });

    ws.on('error', function(err) {
        console.log(err);
    });

});
