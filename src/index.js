import express from 'express';
import cors from 'cors';
const app = express();
app.use(express.json());
app.use(cors());


const participants = [];

app.post("/participants", (req, res) => {
    const {name} = req.body;
    if(!name || name==="") return res.status(422).send("O nome de usuário deve ser informado.");
    const existParticipant = participants.find((participant) => participant.name == name);
    if(existParticipant) return res.status(409).send("Este nome de usuário já existe.");
    participants.push(
        {
            name: name,
           // lastStatus: Date.now()
        }
    );
    res.status(201).send("OK");
});



app.listen(5000, ()=> console.log("servidor rodando"));
