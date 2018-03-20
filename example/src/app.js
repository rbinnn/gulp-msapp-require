var curryN = require('lodash/fp/curryN');
var login = require("custom/login")

App({
    onLoad: function() {
        console.log(curryN)
        login()
    }
})
