const http = require('http');
const express = require('express')
const app = express();
const server = http.createServer(app);
const io = require('socket.io').listen(server);
const path = require('path');
const BFX = require('bitfinex-api-node')
const redis = require('redis');
const moment = require('moment');
const client = redis.createClient();
server.listen(80);

function getFormattedDate() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ':' + seconds;
    return date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear() + " " + strTime;
}

const API_KEY = 'qFcZYZhhSrhTx7IDwHk36Rq7o6uAHZ2J15LOlAABv0u'
const API_SECRET = 'qFcZYZhhSrhTx7IDwHk36Rq7o6uAHZ2J15LOlAABv0u'

const opts = {
    version: 2,
    transform: true
}

const bws = new BFX(API_KEY, API_SECRET, opts).ws
var bwsOpen = false;
var availablePairs = ['tBTCUSD',
        'tETHUSD',
        'tETHBTC',
        'tLTCUSD',
        'tLTCBTC',
        'tEOSUSD',
        'tEOSBTC',
        'tEOSETH',
        'tIOTUSD',
        'tIOTBTC',
        'tIOTETH',
        'tETCUSD',
        'tETCBTC',
        'tZECUSD',
        'tZECBTC',
        'tDSHUSD',
        'tDSHBTC',
        'tXRPUSD',
        'tXRPBTC',
        'tXMRUSD',
        'tXMRBTC',
        'tBCCUSD',
        'tBCCBTC',
        'tRRTUSD',
        'tRRTBTC',
        'tBCUUSD',
        'tBCUBTC',
        'tSANUSD',
        'tSANBTC',
        'tSANETH',
        'tOMGUSD',
        'tOMGBTC',
        'tOMGETH'];
var currentChannel;
var subscribedChannels = [{
    channel: '',
    pair: '',
    chanId: 0
}]

bws.on('open', () => {
    bwsOpen = true;
    console.log('Bitfinex socket connected')
    availablePairs.forEach(function(pair) {
    bws.subscribeTicker(pair)
    bws.subscribeOrderBook(pair)
    bws.subscribeTrades(pair)
    });
})

bws.on('subscribed', function (sub) {
    console.log('Subscribed to: ' + sub.symbol)
    subscribedChannels.push({
        channel: sub.channel,
        symbol: sub.symbol,
        chanId: sub.chanId
    });
})

io.on('connection', function (socket) {
    console.log('socket connected');

    socket.on('subscribe', function (msg) {
        console.log('Client message received:' + msg);

        console.log(msg);
        currentChannel = msg;                
    });

    bws.on('ticker', (pair, ticker) => {
        var now = new Date;
        console.log('Ticker received:' + pair);
        client.zadd(pair + '-' + 'ticker-' + moment(new Date()).format('MM/DD/YYYY hh:mm:ss'), 1,JSON.stringify(ticker));
        socket.emit(pair.replace('t', ''), {
            pair: pair.replace('t', ''),
            ticker: ticker
        });
    });
    bws.on('trade', (pair, trade) => {
        var now = new Date;
        console.log('Trade received:' + pair);
        client.zadd(pair + '-' + 'trade-' + moment(new Date()).format('MM/DD/YYYY hh:mm:ss'), 1,JSON.stringify(trade));
        socket.emit(pair.replace('t', '') + '-trade', {
            pair: pair.replace('t', ''),
            trade: trade
        });
    });
      bws.on('orderbook', (pair, book) => {
        var now = new Date;
        console.log('Trade received:' + pair);
        client.zadd(pair + '-' + 'book-' + moment(new Date()).format('MM/DD/YYYY hh:mm:ss'), 1,JSON.stringify(book));
        socket.emit(pair.replace('t', '') + '-trade', {
            pair: pair.replace('t', ''),
            trade: book
        });
    });

});



// expose public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'views/dashboard.html'))
});

app.get('/icons', function (req, res) {
    res.sendFile(path.join(__dirname, 'views/icons.html'))
});



/*bws.on('orderbook', (pair, book) => {
    console.log('Order book:', book)
})

bws.on('trade', (pair, trade) => {
    console.log('Trade:', trade)
})

bws.on('ticker', (pair, ticker) => {
    console.log('Ticker:', ticker)
})*/

bws.on('error', console.error)


client.on("error", function (err) {
    console.log("Error " + err);
});