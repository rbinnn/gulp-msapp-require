var _ = require("lodash")
var login = require("custom/login")

App({
    onLoad: function() {
        console.log(_)
        login()
    }
})
