var mysql = require('mysql');
// 连接mysql数据库
var connection = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'root',
	port: '3306',
	database: 'shopbook'
});

module.exports=connection;