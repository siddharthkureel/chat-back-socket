const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const cors = require('cors')

const User = require('./models/user')
const MessagesArray = require('./models/messageArray')

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = socketio(server)
const port = process.env.PORT || 3002

io.on('connect', (socket) => {
    console.log('a user is connected')
    let user;
    let messageArray = {
        content: [],
        chatroomId: null
    };
 
    socket.on('active', async ({ userId }, callback)=>{
        console.log(userId)
        user = userId;
        try {
            await User.updateOne({
                "_id": userId 
            }, {
                $set: {
                    "active": true,
                }
            })
            callback()
        } catch (error) {
        }
    })
    socket.on('join', (options, callback) => {
        const { chatroom } = options;
        socket.join(chatroom);
        callback()
    })
    socket.on('sendMessage', async (data, callback) => {
        try {
            const { userId, content, chatroom, createdAt } = data;
            messageArray.content.push({
                userId,
                content,
                createdAt,
                isSent: true
            })
            messageArray.chatroomId=chatroom;
            io.to(chatroom).emit('message', data);
            callback();
        } catch (error) {
            console.log(error);
        }
    })
    socket.on('disconnect', async () => {
        try {
            if(messageArray.chatroomId){
                const messages = new MessagesArray({
                    ...messageArray
                })
                messages.save();
            }
            await User.updateOne({
                "_id": user
            }, {
                $set: {
                    "active": false,
                    "lastSeen": new Date()
                }
            })
        } catch (error) {
        }
    })
})


server.listen(port, () => {
    console.log(`Server is up on port ${port}!`);
})