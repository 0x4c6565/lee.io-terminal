function Terminal(terminal) {
    this.terminal = terminal
    this.output = '';
    this.inputBuffer = '';
    this.cursorX = 0;
    this.promptPrefix = 'lee.io\u00A0>\u00A0';
    this.outputNode = null;
    this.inputNode = null;
    this.promptNode = null;
    this.inputBeforeNode = null;
    this.cursorNode = null;
    this.inputAfterNode = null;
    
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
        let inputBefore = this.inputBuffer.substr(0, this.cursorX);
        let inputAtCursor = (this.inputBuffer.length > this.cursorX) ? this.inputBuffer.charAt(this.cursorX) : " ";
        let inputAfter = (this.inputBuffer.length > this.cursorX) ? this.inputBuffer.substr(this.cursorX + 1) : "";

        this.outputNode.textContent = this.output;
        this.promptNode.nodeValue = this.promptPrefix;
        this.inputBeforeNode.nodeValue = inputBefore;
        this.cursorNode.textContent = inputAtCursor;
        this.inputAfterNode.nodeValue = inputAfter;
        this.terminal.scrollTop = this.terminal.scrollHeight - this.terminal.clientHeight
    }

    this._clearInputBuffer = function() {
        return;
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
        let cursorSuffix = this.inputBuffer.substr(this.cursorX);
        this.inputBuffer = this.inputBuffer.substr(0, this.cursorX) + text + cursorSuffix;
        this.cursorX = this.cursorX+text.length;
        this._flushOutput();
    }
    
    this._deleteInputBeforeCursor = function() {
        if (this.cursorX === 0) {
            return;
        }

        let cursorSuffix = this.inputBuffer.substr(this.cursorX);
        this.inputBuffer = this.inputBuffer.substr(0, this.cursorX-1) + cursorSuffix;
        this.cursorX--;
        this._flushOutput();
    }
    
    this._deleteInputAtCursor = function() {
        if (this.cursorX >= this.inputBuffer.length) {
            return;
        }

        let cursorSuffix = this.inputBuffer.substr(this.cursorX+1);
        this.inputBuffer = this.inputBuffer.substr(0, this.cursorX) + cursorSuffix;
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
            if (this.historyScrollPos > 0) {
                this._writeInputAtCursor(this.history[this.historyScrollPos-1])
            }
        }
    }

    this._prompt = function() {
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
                return 0;
            }
            
            cmd.stdOut(outer.history.reverse().join("\n") + "\n");
            return 0;
        }).withHidden())
            
        this.withCommand("clear", new Command(async function() {
            outer.output = '';
            return 0;
        }).withHidden())
    }

    this._commandOutputFunc = function() {
        let outer = this;
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

        this.terminal.textContent = "";
        this.outputNode = document.createElement("span");
        this.inputNode = document.createElement("span");
        this.promptNode = document.createTextNode("");
        this.inputBeforeNode = document.createTextNode("");
        this.cursorNode = document.createElement("span");
        this.cursorNode.className = "cursor";
        this.inputAfterNode = document.createTextNode("");
        this.inputNode.appendChild(this.promptNode);
        this.inputNode.appendChild(this.inputBeforeNode);
        this.inputNode.appendChild(this.cursorNode);
        this.inputNode.appendChild(this.inputAfterNode);
        this.terminal.appendChild(this.outputNode);
        this.terminal.appendChild(this.inputNode);

        let outer = this;
        this.terminal.addEventListener('keydown', async function (e) {
            e.preventDefault();
            switch (true) {
                case (e.key == "Enter"):
                    outer.output = outer.output + outer.promptPrefix + outer.inputBuffer + "\n"
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
                    outer.output = outer.output + outer.promptPrefix + outer.inputBuffer + "\n"
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

        this.terminal.focus();
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