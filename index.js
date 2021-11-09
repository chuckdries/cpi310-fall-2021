const express = require('express');
const exphbs  = require('express-handlebars');

const app = express();

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

app.use(express.urlencoded())

const messages = [];

app.get('/', function (req, res) {
  res.render('home', { messages });
})

app.post('/message', (req, res) => {
  console.log('body', req.body);
  messages.push(req.body.message);
  res.redirect('/');
})

app.listen(8080)