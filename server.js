const path = require("path");
const static = require('node-static');

let file = new static.Server(__dirname);

let PORT_SOCKET = process.argv[2];
let PORT_STATIC = process.argv[3];

if (PORT_STATIC) {
    let server = require('http').createServer(function(request, response) {
        request.addListener('end', function() {
            file.serve(request, response);
        }).resume();
    }).listen(PORT_STATIC);
}

let WebSocketServer = new require('ws');

let clients = {}; // all web socket clients
let supports = {}; // all web socket supports

var webSocketServer = new WebSocketServer.Server({
    port: PORT_SOCKET
}, console.log('@>peer chat was running on ' + PORT_STATIC + ' socket on: ' + PORT_SOCKET));

let { ADMIN_ID } = require(path.join(__dirname, "cfg"));

webSocketServer.on('connection', function(ws) {

    let id = Date.now() + "";

    try {
        id += ws.upgradeReq.headers.cookie.match(/currentAccount=([a-z,0-9,-]+)/g)[0];
    } catch (err) {
        console.log('@>err cookie')
    }

    try {
        if (~ws.upgradeReq.headers["sec-websocket-protocol"].indexOf(ADMIN_ID)) {
            id += "support"
            supports[id] = ws;
        }
    } catch (err) {
        console.log('@>err protocol not support')
    }

    if (id.indexOf("support") == -1) {
        clients[id] = ws;
        ws.send(JSON.stringify({
            id: id,
            message: "you was connected to support",
            supports: Object.keys(supports).length,
            type: "to_client"
        }));
    }

    console.log("new connect: ", id);

    ws.on('message', function(msg) {

        try {
            msg = JSON.parse(msg)
        } catch (err) {
            msg: '{"message":error}'
        }

        let send_id = msg.id || id;

        console.log('@>message', msg, id);


        if (clients[send_id] && clients[send_id].readyState === clients[send_id].OPEN) {
            clients[send_id].send(JSON.stringify({
                id: id,
                message: msg.message,
                supports: Object.keys(supports),
                type: "to_client"
            }));
        }

        for (let i in supports) {
            supports[i].send(JSON.stringify({
                chat_id: send_id,
                message: msg.message,
                supports: Object.keys(supports),
                id: id,
                type: "to_support"
            }));
        }

    });

    ws.on('close', function() {
        console.log('connection was closed ' + id);

        for (let i in supports) {
            if (supports[i].readyState === supports[i].OPEN) {
                supports[i].send(JSON.stringify({
                    id,
                    message: "/close"
                }));
            }
        }

        if (id.indexOf("support") == -1 && clients[id] && clients[id].readyState === clients[id].OPEN) {
            clients[id].send(JSON.stringify({
                id,
                message: "/close"
            }));
        }

        delete clients[id];
        delete supports[id];
    });

    ws.on('error', function(err) {
        console.log(err);
    });


    for (let i in supports) {
        supports[i].send(JSON.stringify({
            clients: Object.keys(clients),
            supports: Object.keys(supports),
            id: id,
            type: "clients"
        }));
    }

    console.log('@>clients', Object.keys(clients).length, Object.keys(clients));
    console.log('@>supports', Object.keys(supports).length, Object.keys(supports));

});
