var localVideo;
var localStream;
var myName;
var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;
 
var name; 
var connectedUser;

var peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');

serverConnection.onopen = function () { 
  console.log("Connected to the signaling server"); 
};

serverConnection.onmessage = gotMessageFromServer;

document.getElementById('otherElements').hidden = true;
var usernameInput = document.querySelector('#usernameInput'); 
var usernameShow = document.querySelector('#showLocalUserName'); 
var showAllUsers = document.querySelector('#allUsers');
var remoteUsernameShow = document.querySelector('#showRemoteUserName');
var loginBtn = document.querySelector('#loginBtn');
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn'); 
var hangUpBtn = document.querySelector('#hangUpBtn');


// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) { 
  name = usernameInput.value; 
  usernameShow.innerHTML = "Hello, "+name;
  if (name.length > 0) { 
     send({ 
        type: "login", 
        name: name 
     }); 
  } 
 
});


/* START: Register user for first time i.e. Prepare ground for webrtc call to happen */
function handleLogin(success,allUsers) { 
  if (success === false) { 
    alert("Ooops...try a different username"); 
  } 
  else { 
    
    var allAvailableUsers = allUsers.join();
    console.log('All available users',allAvailableUsers)
    showAllUsers.innerHTML = 'Available users: '+allAvailableUsers;
    localVideo = document.getElementById('localVideo');
    remoteVideo = document.getElementById('remoteVideo');
    document.getElementById('myName').hidden = true;
    document.getElementById('otherElements').hidden = false;

  

  var constraints = {
    video: true,
    audio: true,
  };

  /* START:The camera stream acquisition */
  if(navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }
  /* END:The camera stream acquisition */
  }
}
/* END: Register user for first time i.e. Prepare ground for webrtc call to happen */


function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
  yourConn = new RTCPeerConnection(peerConnectionConfig);
  
  yourConn.onicecandidate = function (event) { 
    if (event.candidate) { 
       send({ 
          type: "candidate", 
          candidate: event.candidate 
       }); 
    } 
  }; 
  yourConn.ontrack = gotRemoteStream;
  yourConn.addStream(localStream);
}



/* START: Initiate call to any user i.e. send message to server */
callBtn.addEventListener("click", function () {
  console.log('inside call button')

  var callToUsername = document.getElementById('callToUsernameInput').value;
	
  if (callToUsername.length > 0) { 
    connectedUser = callToUsername; 
    console.log('nameToCall',connectedUser);
    console.log('create an offer to-',connectedUser)
    yourConn.createOffer(function (offer) { 
       send({
          type: "offer", 
          offer: offer 
       }); 
    
       yourConn.setLocalDescription(offer); 
    }, function (error) { 
       alert("Error when creating an offer"); 
    }); 
  } 
  else 
    alert("username can't be blank!")
});
/* END: Initiate call to any user i.e. send message to server */


/* START: Recieved call from server i.e. recieve messages from server  */
function gotMessageFromServer(message) {
  console.log("Got message", message.data); 
  var data = JSON.parse(message.data); 
 
  switch(data.type) { 
    case "login": 
      handleLogin(data.success,data.allUsers); 
    break; 
     //when somebody wants to call us 
    case "offer": 
      console.log('inside offer')
      handleOffer(data.offer, data.name); 
    break; 
    case "answer": 
      console.log('inside offer')
      handleAnswer(data.answer); 
    break; 
     //when a remote peer sends an ice candidate to us 
    case "candidate": 
      console.log('inside handle candidate')
      handleCandidate(data.candidate); 
    break; 
    case "leave": 
      handleLeave(); 
    break; 
    default: 
      break; 
  } 

  serverConnection.onerror = function (err) { 
    console.log("Got error", err); 
  };

}

function send(msg) { 
  //attach the other peer username to our messages 
  if (connectedUser) { 
    msg.name = connectedUser; 
  } 
  console.log('msg before sending to server',msg)
  serverConnection.send(JSON.stringify(msg)); 
};

/* START: Create an answer for an offer i.e. send message to server */
function handleOffer(offer, name) { 
  
  connectedUser = name; 
  yourConn.setRemoteDescription(new RTCSessionDescription(offer)); 
 
  //create an answer to an offer 
  yourConn.createAnswer(function (answer) { 
    yourConn.setLocalDescription(answer); 
   
    send({ 
      type: "answer", 
        answer: answer 
    });
   
  }, function (error) { 
     alert("Error when creating an answer"); 
  }); 
};

function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
}

function errorHandler(error) {
  console.log(error);
}

//when we got an answer from a remote user 
function handleAnswer(answer) { 
  yourConn.setRemoteDescription(new RTCSessionDescription(answer)); 
};

//when we got an ice candidate from a remote user 
function handleCandidate(candidate) { 
  yourConn.addIceCandidate(new RTCIceCandidate(candidate)); 
};

//hang up
hangUpBtn.addEventListener("click", function () { 
  send({ 
     type: "leave" 
  }); 
 
  handleLeave(); 
});

function handleLeave() { 
  connectedUser = null; 
  remoteVideo.src = null; 
 
  yourConn.close(); 
  yourConn.onicecandidate = null; 
  yourConn.onaddstream = null; 
};

