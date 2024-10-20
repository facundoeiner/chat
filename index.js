import express from "express";
import logger from "morgan";
import { Server } from "socket.io";
import {createServer} from 'node:http';
import dotenv from 'dotenv';
dotenv.config();
import { createClient} from "@libsql/client";
const port = process.env.PORT || 3000
; // Asegúrate de que siempre se use la variable PORT

console.log(process.cwd()+"/index.html");
const app=express();
app.use(logger('dev'));
app.use(express.static(process.cwd()));

app.get('/',(req,res)=>{
    

    res.sendFile(process.cwd()+"/index.html");
})





const server= createServer(app);
const io=new Server(server,{
    connectionStateRecovery:{}
})

const db= createClient({
    url:'libsql://sweet-jolt-facu.turso.io',
    // authToken: process.env.DB_TOKEN
    authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3Mjk0NDM0MTUsImlkIjoiZmM4M2Y1OTEtZjFlMS00OGQ0LThlMjMtMzhjM2FmOTcwMTE3In0.iYCIONRp3NJuOto4QWVhJ3J9fFBkhhTnoaqPKfp1KGKwKZiiYIutrwZv3bMp9jH3JQ3QGZVbqvUnvv__Qp5rDA'
})

 await db.execute(`
    CREATE TABLE IF NOT EXISTS messages(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        user TEXT
    )  
    
`)
const userColors = []; 
const idus=[]

io.on('connection',async (socket)=>{
    console.log("a user has connected!" , socket.id);
    socket.broadcast.emit('user connected', 'Un nuevo usuario se ha conectado');
    if (!userColors[socket.id]) {
        
        userColors[socket.id] = `#${Math.floor(Math.random() * 16777215).toString(16)}`; // Color aleatorio
    }
    const userColor = userColors[socket.id]; 
    console.log()
    socket.on('disconnect',()=>{
        console.log('an user has disconnected')
        
    });
    socket.on('chat message',async(msg)=>{
       let resut;
       try{
        resut=await db.execute({
              sql: `INSERT INTO messages (content) VALUES (:content)`,
              args:{content: msg}

        })
       }catch(e){
            console.error(e)
            return
       }
        io.emit('chat message',msg, resut.lastInsertRowid.toString(),userColor);  
    })
    console.log('auth');
    console.log(socket.handshake.auth);
    if(!socket.recovered){ //recuperar los msj sin conexion
        try{
            const result= await db.execute({
                sql:'SELECT id, content FROM messages WHERE id > ?',
                args: [socket.handshake.auth.serverOffset ?? 0]
            });
            result.rows.forEach(row=>{
                socket.emit('chat message', row.content, row.id.toString());
            })
        }catch(e){

        }
    }
})

console.log('eee')


server.listen(port, ()=>{
    console.log(`server runig on port ${port}`)
})


