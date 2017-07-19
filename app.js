const http = require('http');
const express = require('express')
const app = express();
const server = http.createServer(app);
const io = require('socket.io').listen(server);
const path = require('path');
const BFX = require('bitfinex-api-node')
const redis = require('redis');
const client = redis.createClient();
server.listen(80);

function getFormattedDate() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0' + minutes : minutes;
    var strTime = hours + ':' + minutes + ' ' + ampm;
    return date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear() + " " + strTime;
}

const API_KEY = ''
const API_SECRET = ''

const opts = {
    version: 2,
    transform: true
}

const bws = new BFX(API_KEY, API_SECRET, opts).ws
var bwsOpen = false;
var currentChannel;
var subscribedChannels = [{
    channel: '',
    pair: '',
    chanId: 0
}]

bws.on('open', () => {
    bwsOpen = true;
    console.log('Bitfinex socket connected')
    /*  bws.subscribeOrderBook('BTCUSD')
      bws.subscribeTrades('BTCUSD')*/
})

bws.on('subscribed', function (sub) {
    console.log(sub)
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
        var tickerFound = false;
        var tradeFound = false;
        subscribedChannels.forEach(function (item) {
            if (item.symbol === ('t' + msg) && item.channel == 'trades') {
                bws.unsubscribe(item.chanId);
                bws.subscribeTicker(msg);
            } else {
                bws.subscribeTrades(msg)
            }
            if (item.symbol === ('t' + msg) && item.channel == 'ticker') {
                bws.unsubscribe(item.chanId);
                bws.subscribeTicker(msg);
            } else {
                bws.subscribeTicker(msg);
            }
            return;
        });
        subscribedChannels = [];
    });

    bws.on('ticker', (pair, ticker) => {
        var now = new Date;
        console.log('Ticker received:' + pair);
        //client.set(pair + '-' + getFormattedDate(), JSON.stringify(ticker), redis.print);
        socket.emit(pair.replace('t', ''), {
            pair: pair.replace('t', ''),
            ticker: ticker
        });
    });
    bws.on('trade', (pair, trade) => {
        var now = new Date;
        console.log('Trade received:' + pair);
        //client.set(pair + '-' + getFormattedDate(), JSON.stringify(ticker), redis.print);
        socket.emit(pair.replace('t', '') + '-trade', {
            pair: pair.replace('t', ''),
            trade: trade
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