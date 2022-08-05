function Terminal(terminal) {
    this.terminal = terminal
    this.output = '';
    this.inputBuffer = '';
    this.cursorX = 0;
    this.promptPrefix = 'lee.io > ';
    
    this.history = [];
    this.historyScrollPos = 0;
    this.historyLimit = 100;

    this.commands = [];
    this.lastExitCode = null;

    this._escapeHTML = function(unsafe) {
        return unsafe.replace(/[&<"']/g, function(m) {
            switch (m) {
                case '&':
                    return '&amp;';
                case '<':
                    return '&lt;';
                case '"':
                    return '&quot;';
                default:
                    return '&#039;';
            }
        });
    };

    this._flushOutput = function() {
        let outputBuffer = this._escapeHTML(this.output.substr(0, (this.output.length - this.inputBuffer.length) + this.cursorX))
                           + `<span class="cursor">${this._escapeHTML((this.inputBuffer.length > this.cursorX) ? this.output.charAt((this.output.length - this.inputBuffer.length) + this.cursorX) : " ")}</span>`
                           + this._escapeHTML(this.output.substr((this.output.length - this.inputBuffer.length) + this.cursorX+1))

        this.terminal.innerHTML = outputBuffer;
        this.terminal.scrollTop = this.terminal.scrollHeight - this.terminal.clientHeight
    }

    this._clearInputBuffer = function() {
        if (this.output.length >= this.inputBuffer.length) {
            this.output = this.output.substr(0, (this.output.length - this.inputBuffer.length))
        }
    }

    this._newInputBuffer = function() {
        this.cursorX = 0
        this.inputBuffer = '';
        this._flushOutput();
    }

    this._resetInputBuffer = function() {        
        this._clearInputBuffer();
        this._newInputBuffer();
    }
    
    this._writeInputAtCursor = function(text='') {
        this._clearInputBuffer();

        let cursorSuffix = this.inputBuffer.substr(this.cursorX);
        this.inputBuffer = this.inputBuffer.substr(0, this.cursorX) + text + cursorSuffix;
        this.cursorX = this.cursorX+text.length;

        this.output = this.output + this.inputBuffer;
        this._flushOutput();
    }
    
    this._deleteInputBeforeCursor = function() {
        this._clearInputBuffer();

        let cursorSuffix = this.inputBuffer.substr(this.cursorX);
        this.inputBuffer = this.inputBuffer.substr(0, this.cursorX-1) + cursorSuffix;
        if (this.cursorX > 0) {
            this.cursorX--;
        }

        this.output = this.output + this.inputBuffer;
        this._flushOutput();
    }
    
    this._deleteInputAtCursor = function() {
        this._clearInputBuffer();

        let cursorSuffix = this.inputBuffer.substr(this.cursorX+1);
        this.inputBuffer = this.inputBuffer.substr(0, this.cursorX) + cursorSuffix;

        this.output = this.output + this.inputBuffer;
        this._flushOutput();
    }

    this._moveCursorStart = function() {
        this.cursorX = 0;
        this._flushOutput();
    }

    this._moveCursorEnd = function() {
        this.cursorX = this.inputBuffer.length;
        this._flushOutput();
    }

    this._moveCursorLeft = function() {
        if (this.cursorX > 0) {
            this.cursorX--;
            this._flushOutput();
        }
    }

    this._moveCursorRight = function() {
        if (this.cursorX < this.inputBuffer.length) {
            this.cursorX++;
            this._flushOutput();
        }
    }

    this._scrollHistoryPrevious = function() {
        if (this.history.length > 0) {
            if (this.historyScrollPos < this.history.length) {              
                this.historyScrollPos++;
            }

            this._resetInputBuffer();
            this._writeInputAtCursor(this.history[this.historyScrollPos-1])
        }
    }

    this._scrollHistoryNext = function() {
        if (this.history.length > 0 && this.historyScrollPos > 0) {
            this.historyScrollPos--;

            this._resetInputBuffer();
            this._writeInputAtCursor(this.history[this.historyScrollPos-1])
        }
    }

    this._prompt = function() {
        this.output = this.output + this.promptPrefix
        this.historyScrollPos = 0;
        this._newInputBuffer();
    }

    this._addCommand = function(name, cmd) {        
        if (!this._commandExists(name)) {
            this.commands[name] = cmd
        }
    }

    this._commandExists = function(name) {
        return (name in this.commands);
    }

    this._getCommand = function(name) {
        if (this._commandExists(name)) {
            return this.commands[name];
        }

        return undefined;
    },

    this._getCommands = function() {
        return this.commands
    }

    this._initInternalCommands = function() {
        let outer = this;
        this.withCommand("help", new Command(async function(cmd, name) {
            if (name !== undefined && name !== "") {
                if (!outer._commandExists(name)) {
                    cmd.stdErr(`No help entry for '${name}'\n`);
                    return 1;
                }
                cmd.stdOut(outer._getCommand(name).getHelp() + "\n");
                return 0;
            }
    
            function getCommandNameMaxLength() {
                var length = 10;
                for (var commandName in outer._getCommands()) {
                    if (commandName.length > length) {
                        length = commandName.length
                    }
                }
                return length
            }
    
            let output = "Commands:\n";
            var commandPadLength = getCommandNameMaxLength();
            for (let commandName in outer._getCommands()) {
                let command = outer._getCommand(commandName);
                if (!command.getHidden()) {
                    let summary = command.getSummary();
                    output += `\n${commandName.padEnd(commandPadLength, ' ')} : ` + ((summary) ? summary : "N/A");
                }
            }

            cmd.stdOut(output + "\n");
            return 0;
        }).withSummary("Prints help page. Use 'help <command>' to display help for a command")
          .withHelp("No u"))
            
        this.withCommand("history", new Command(async function(cmd, ...args) {
            let argsParsed = parseArg(args ? args.join(' ') : "")
            if (argsParsed.c === true) {
                outer.history = [];
            }
            
            cmd.stdOut(outer.history.join("\n") + "\n");
            return 0;
        }).withHidden())
            
        this.withCommand("clear", new Command(async function() {
            outer.output = '';
            return 0;
        }).withHidden())
    }

    this._commandOutputFunc = function() {
        outer = this;
        return {
            stdOut: function(text) {
                outer.output = outer.output + text
                outer._flushOutput();
            },
            stdErr: function(text) {
                outer.output = outer.output + text
                outer._flushOutput();
            }
        }
    }

    // Public

    this.withCommand = function(name, cmd) {
        this._addCommand(name, cmd)
        return this;
    }

    this.run = function() {
        this._initInternalCommands();

        let outer = this;
        document.addEventListener('keydown', async function (e) {
            e.preventDefault();
            switch (true) {
                case (e.key == "Enter"):
                    outer.output = outer.output + "\n"
                    if (outer.inputBuffer.length > 0) {
                        if (outer.history.length > outer.historyLimit) {
                            outer.history.pop()
                        }
                        outer.history.unshift(outer.inputBuffer)

                        let inputBufferSplit = outer.inputBuffer.split(' ')
                        let command = inputBufferSplit.shift();

                        outer._flushOutput();
                        if (outer._commandExists(command)) {
                            let exitCode = await outer.commands[command].execute(outer._commandOutputFunc(), ...inputBufferSplit);
                            outer.lastExitCode = (exitCode) ? exitCode : 0;                            
                        } else {
                            outer.output = outer.output + command + ': command not found\n';
                            outer._flushOutput();
                        }
                    }
                    outer._prompt();
                    break;
                case (e.key == "c" && e.ctrlKey):
                    outer.output = outer.output + "\n"
                    outer._prompt();
                    break;
                case (e.key == "Backspace"):
                    outer._deleteInputBeforeCursor()
                    break;
                case (e.key == "Delete"):
                    outer._deleteInputAtCursor()
                    break;
                case (e.key == "ArrowLeft"):
                    outer._moveCursorLeft();
                    break;
                case (e.key == "ArrowRight"):
                    outer._moveCursorRight();
                    break;
                case (e.key == "Home"):
                    outer._moveCursorStart();
                    break;
                case (e.key == "End"):
                    outer._moveCursorEnd();
                    break;
                case (e.key == "ArrowUp"):
                    outer._scrollHistoryPrevious();
                    break;
                case (e.key == "ArrowDown"):
                    outer._scrollHistoryNext();
                    break;
                default:
                    if (e.key.length == 1) {
                        outer._writeInputAtCursor(e.key)
                    }
            }
        });

        this.output = `Type 'help' for help\n`
        this._prompt();
    }
}

function Command(func) {
    this.func = func

    this.withFunc = function(func) {
        this.func = func
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

// https://github.com/tnhu/arg
function parseArg(argv="") {
    let result = {}; // reset
    let i = 0;
    let item = null;
    for (
        argv = argv.split(/\s*\B[\/-]+([\w-]+)[\s=]*/), i = 1;

        item = argv[i++]; // while !eoargv

        result[item] = argv[i++] || !0 // set value, default true
    );
    return result;
}