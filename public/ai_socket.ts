import WebSocket from 'ws'

class AISocket{
	url:string;
	socket:WebSocket;
  constructor(url) {
		this.url = url;
		this.socket = new WebSocket(url)
		const socket = this.socket
		this.socket.onopen = function() {
			console.log("Connected.")
			socket.send("test send data");
		};
		this.socket.binaryType = "blob";
		this.socket.onmessage = function (event) {
			console.log(event.data);
		}
  }
	requestOCR(image:File, req_id:number){
		var buffer = new ArrayBuffer(8);
		var dataview = new DataView(buffer);
		dataview.setInt32(0, 9438);
		dataview.setFloat32(4, 3224.3224);
	}
	sendFile(file) {
		var reader = new FileReader();
		var rawData = new ArrayBuffer(8);            
		const socket = this.socket
		reader.onload = function(e) {
				rawData = e.target.result as ArrayBuffer;
				socket.send(rawData);
				console.log("the File has been transferred.")
		}
		reader.readAsArrayBuffer(file);
	}
}	

const socket = new AISocket("ws://localhost:8765")