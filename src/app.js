import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import './xterm.css';

var term = new Terminal();
var fitAddon = new FitAddon();
term.open(document.getElementById('terminal')); 
term.setOption('theme', { 
    background: '#1E1E1E',
    foreground: '#ECECEC',
    blue: '#569CD6',
    cursor: '#ECECEC'
});
term.element.style.padding = '10px'
term.loadAddon(fitAddon);
fitAddon.fit();


function Command(func, opts) {
    this.func = func
    this.opts = opts

    this.getOptions = function() {
        return this.opts
    }
}

var commandCollection = {
    "commands": [],
    "exists": function(command) {
        return (command in this.commands);
    },
    "get": function(command) {
        if (this.exists(command)) {
            return this.commands[command];
        }

        return undefined;
    },
    "getAll": function() {
        return this.commands;
    },
    "add": function(name, cmd) {
        if (!this.exists(name)) {
            this.commands[name] = cmd
        }
    }
}

commandCollection.add("about", new Command(function() {
    term.write( "\r\nI r Lee Spottiswood. I do Dev(Ops) shit\r\n"+
                "\r\nGithub: https://github.com/0x4c6565"+
                "\r\nGitLab: https://gitlab.com/0x4c6565"+
                "\r\nTwitter: https://twitter.com/leespottiswood");
}, {summary: "Prints information about me", help: "Prints information about me"}))

commandCollection.add("tools", new Command(function() {
    term.write( "\r\nHere be tools I've made");
}, {summary: "Prints information about available tools", help: "Prints information about available tools"}))

commandCollection.add("help", new Command(function() {
    function getCommandNameMaxLength() {
        var length = 10;
        for (var commandName in commandCollection.getAll()) {
            if (commandName.length > length) {
                length = commandName.length
            }
        }
        return length
    }

    term.write("\r\nCommands:\r\n");
    var commandPadLength = getCommandNameMaxLength();
    for (var commandName in commandCollection.getAll()) {
        var command = commandCollection.get(commandName);
        if (!command.getOptions().hidden) {
            term.write(`\r\n${commandName.padEnd(commandPadLength, ' ')} : `+commandCollection.get(commandName).getOptions().summary);
        }
    }

}, {summary: "Prints help page", help: "Prints help page"}))

commandCollection.add("man", new Command(function(args) {
    if (!commandCollection.exists(args)) {
        term.write(`\r\nNo manual entry for '${args}'`);
        return;
    }

    term.write('\r\n'+commandCollection.get(args).getOptions().help);
}, {summary: "Shows man page for command", help: "no, u"}))

commandCollection.add("clear", new Command(function() {
    term.clear();
}, {summary: "Clears the terminal", help: "Clears the terminal", hidden: true}))


commandCollection.add("tool", new Command(function(args) {
    function executeTool(name, args) {
        var uri = (`https://lee.io/${name}/${args.join("/")}`).replace(/\/$/, "")
    
        $.ajax({
            url: uri,
            dataType: 'text',
            success: function(data) {
                term.write("\r\n\r\n"+data.replace(/\n/g, "\r\n")+"\r\n");
            },
            error: function(jqXHR, textStatus) {
                term.write(`\r\nFailed with status '${jqXHR.status}': ${textStatus}`);
            },
            async: false
        });
    }

    var tools = [
        "geoip"
    ]

    if (args.length < 1) {
        term.write("\r\nNo tool name provided. See help for more info");
        return
    }

    var name = args.shift()

    if (!tools.includes(name)) {
        term.write(`\r\nInvalid tool '${name}'. See help for more info`);
        return
    }

    executeTool(name, args)

}, {summary: "Executes a tool. See man for more info", help: "GeoIP: Retreives GeoIP information for current (or specified IP/Host)"}))


function runTerminal() {
    if (term._initialized) {
      return;
    }

    term._initialized = true;

    var promptText = 'lee.io > ';
    var promptLength = promptText.length;

    term.prompt = () => {
      term.write(`\r\n${promptText}`);
    };

    var inputBuffer = "";

    term.onData(e => {
        switch (e) {
            case '\r': // Enter
                let inputBufferSplit = inputBuffer.split(' ')
                let command = inputBufferSplit.shift();
                
                if (command !== "") {
                    if (commandCollection.exists(command)) {
                        commandCollection.get(command).func(inputBufferSplit);
                    } else {
                        term.write(`\r\n${command}: command not found`);
                    }
                }
                inputBuffer = "";
                term.prompt();
                break;
            case '\u0003': // Ctrl+C
                term.prompt();
                break;
            case '\u007F': // Backspace
                // Preserve prompt
                if (term._core.buffer.x > promptLength) {
                    term.write('\b \b');
                    inputBuffer = inputBuffer.substring(0,inputBuffer.length-1)
                }
                break;
            default: // Add characters to buffer
                if (/^[ \w\-\.]*$/.test(e)) {
                    term.write(e);
                    inputBuffer = inputBuffer + e;
                }
        }
    });

    term.write('Type \x1B[34mhelp\x1B[0m for help');
    term.prompt();
    term.focus();
}

runTerminal()