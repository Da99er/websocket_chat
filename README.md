# Online websocket chat for support

#### Before run you need set password for support

in cfg.js
```sh
{
	"ADMIN_ID":"test123"
}
```
In support/index.html you need set the same password your wss address
```sh
var chat_socket = new WebSocket("ws://127.0.0.1:8087", "test123");
```
#### How to use
```sh
$ npm i 
$ node server.js WEBSOCKETPORT  // 8080
```
Enjoy.
