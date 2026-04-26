const mongoose = require('mongoose');

const uri = "mongodb://jithesh:Ganesh%401234@ac-svlli7x-shard-00-00.itfokir.mongodb.net:27017,ac-svlli7x-shard-00-01.itfokir.mongodb.net:27017,ac-svlli7x-shard-00-02.itfokir.mongodb.net:27017/alumni_platform?ssl=true&replicaSet=atlas-svlli7x-shard-0&authSource=admin&retryWrites=true&w=majority&appName=smartaliminimentoringsystem";

mongoose.connect(uri)
  .then(() => {
    console.log("SUCCESS!");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAILED:", err.message);
    process.exit(1);
  });
