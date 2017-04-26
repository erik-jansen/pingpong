// JavaScript source code
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get('/style.css', function (req, res) {
    res.sendFile(__dirname + '/style.css');
});
var players = [];
var rackets = [];
var oldBall = { left: 0, top: 0, direction: 160 };
var interval;

function clearState()
{
    players = [];
    rackets = [];
    oldBall = { left: 0, top: 0, direction: 160 };
}

io.on('connection', function (socket) {
    socket.on('register', function (playerName) {
        
        registerPlayerAndStart(playerName, socket);

        
    });

    socket.on('playAgain', function(playerName)
    {
        registerPlayerAndStart(playerName, socket);
    });

    socket.on('racketCoords', function (msg) {
        const racketCoords = JSON.parse(msg);
        rackets[racketCoords.playerId] = racketCoords;
        // console.log(rackets);
        socket.broadcast.emit('racketCoords', msg);
    });

    socket.on('disconnect', function () {
        const idx = players.findIndex(player => player.id === socket.id);
        players.splice(idx, 1);
        console.log('disconnect:', socket.id, idx, players);
    })
});

var port = process.env.PORT || 3000;

http.listen(port, function () {
    console.log('listening on *:%d', port);
});

function registerPlayerAndStart(playerName, socket)
{
    const playerId = players.length;
    init = {
        'deg': playerId === 0 ? 0 : 180,
        'racketLocation': playerId === 0 ? 'bottom' : 'top',
        'player': {}
    }
    
    player = {
        'id': playerId,
        'name': playerName,
        'socketId': socket.id
    }

    init.player = player;

    players.push(player);
    console.log(players);
    socket.emit('register', JSON.stringify(init));

    if (players.length === 2) {
            console.log('start game', players.length);
            io.sockets.emit('start', JSON.stringify(players));
            setTimeout(() => {
                interval = setInterval(() => {
                    const collisionResult = paintBall();
                    if (collisionResult > -1)
                    {
                        clearInterval(interval);
                        clearState();
                        io.sockets.emit('finish', collisionResult);
                    }
                    else {
                        io.sockets.emit('ball', JSON.stringify(oldBall));
                    }
                    
                }, 10)
            }, 4000);
        }
}

function paintBall() {
    const collisionResult = checkBounds();

    const speed = 5;

    const rad = ((oldBall.direction / 180) * Math.PI) - (Math.PI / 180) * 90;
    const xDiff = Math.cos(rad) * speed;
    const yDiff = Math.sin(rad) * speed;

    ball = {
        left: oldBall.left + xDiff,
        right: oldBall.left + xDiff + 10,
        top: oldBall.top + yDiff,
        bottom: oldBall.top + yDiff + 10,
        direction: oldBall.direction,
        speed: speed
    };

    oldBall = ball;
    //console.log(oldBall.bottom, oldBall.direction);

    return collisionResult;
}

function checkBounds() {
    //const ballCoords = ball.getBoundingClientRect();
    //const racketCoords = rackets[0].getBoundingClientRect();
    let retval = -1;

    // check left and right walls
    if (oldBall.left < 0
        || oldBall.right > 600
    ) {
        oldBall.direction = getNewL2RDirection(oldBall.direction);
        //console.log('Changed direction L2R');
    }

    // check top wall
    if (oldBall.top < 0) {
        //oldBall.direction = getNewT2BDirection(oldBall.direction);
        //console.log('Changed direction T2B');
        console.log('...PLAYER 2 LOST GAME...');
        retval = 1;
    }

    // check bottom hole
    // if reached, you lose
    if (oldBall.bottom > 400) {
        oldBall.direction = getNewT2BDirection(oldBall.direction);
        console.log('...PLAYER 1 LOST GAME...');
        //console.log('Changed direction T2B');
        //clearInterval(interval);
        //retval = 0;
    }

    if (oldBall.bottom > rackets[0].top
        && oldBall.left > rackets[0].left
        && oldBall.right < rackets[0].right) {
        oldBall.direction = getNewT2BDirection(oldBall.direction);
        console.log('hit racket player 1');
    }

    if (oldBall.top < rackets[1].bottom
        && oldBall.left > rackets[1].left
        && oldBall.right < rackets[1].right) {
        oldBall.direction = getNewT2BDirection(oldBall.direction);
        console.log('hit racket player 2');
    }

    return retval;
 }

function getNewT2BDirection(direction) {
    let retval = 0;
    if (direction <= 180) {
        retval = 180 - direction;
    }
    else if (direction <= 270) {
        retval = 360 - (direction - 180)
    }
    else {
        retval = (180 + (360 - direction));
    }

    return retval;
}

function getNewL2RDirection(direction) {
    let retval = 0;
    if (direction <= 90) {
        retval = 360 - direction;
    }
    else if (direction <= 180) {
        retval = 180 + (90 - (direction - 90));
    }
    else if (direction <= 270) {
        retval = 90 + (90 - (direction - 180));
    }
    else {
        retval = (90 - (direction - 270));
    }

    return retval;
}
