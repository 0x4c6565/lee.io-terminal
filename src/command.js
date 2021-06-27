module.exports = function(func) {
    this.func = func

    this.withFunc = function(func) {
        this.func = func
        return this
    }

    this.withCompletion = function(completion) {
        this.completion = completion
        return this
    }

    this.withSummary = function(summary) {
        this.summary = summary
        return this
    }

    this.withHelp = function(help) {
        this.help = help
        return this
    }

    this.withHidden = function() {
        this.hidden = true
        return this
    }

    this.getCompletion = function() {
        return this.completion
    }

    this.getHelp = function() {
        return this.help
    }

    this.getSummary = function() {
        return this.summary
    }

    this.getHidden = function() {
        return this.hidden
    }

    this.execute = function(cmd, ...args) {
        return this.func(cmd, ...args)
    }
}