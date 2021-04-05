module.exports = function() {
    this._commands = [];

    this.addCommand = function(name, cmd) {
        if (!this.commandExists(name)) {
            this._commands[name] = cmd
        }
    }

    this.commandExists = function(name) {
        return (name in this._commands);
    }

    this.getCommand = function(name) {
        if (this.commandExists(name)) {
            return this._commands[name];
        }

        return undefined;
    },

    this.getCommands = function() {
        return this._commands
    }
}