/**
 * @class Renderer
 * @description Handles all DOM manipulation and rendering for the terminal
 */
class Renderer {
    /**
     * @param {HTMLElement} terminalElement - The terminal DOM element
     * @param {string} promptPrefix - The prompt prefix to display
     */
    constructor(terminalElement, promptPrefix) {
        this.terminal = terminalElement;
        this.promptPrefix = promptPrefix;
        this.outputNode = null;
        this.inputNode = null;
        this.promptNode = null;
        this.inputBeforeNode = null;
        this.cursorNode = null;
        this.inputAfterNode = null;
    }

    /**
     * Initialize the renderer's DOM elements
     */
    initialize() {
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
    }

    /**
     * Render the current terminal state
     * @param {string} output - Current output text
     * @param {string} inputBuffer - Current input buffer
     * @param {number} cursorX - Current cursor position
     */
    render(output, inputBuffer, cursorX) {
        const inputBefore = inputBuffer.substring(0, cursorX);
        const inputAtCursor = (inputBuffer.length > cursorX) ? inputBuffer.charAt(cursorX) : " ";
        const inputAfter = (inputBuffer.length > cursorX) ? inputBuffer.substring(cursorX + 1) : "";

        this.outputNode.textContent = output;
        this.promptNode.nodeValue = this.promptPrefix;
        this.inputBeforeNode.nodeValue = inputBefore;
        this.cursorNode.textContent = inputAtCursor;
        this.inputAfterNode.nodeValue = inputAfter;

        // Auto-scroll to bottom
        this.terminal.scrollTop = this.terminal.scrollHeight - this.terminal.clientHeight;
    }

    /**
     * Get the terminal element for event listeners
     * @returns {HTMLElement} The terminal element
     */
    getElement() {
        return this.terminal;
    }

    /**
     * Focus the terminal
     */
    focus() {
        this.terminal.focus();
    }
}

/**
 * @class InputBuffer
 * @description Manages terminal input buffer state
 */
class InputBuffer {
    constructor() {
        this.buffer = '';
        this.cursorX = 0;
    }

    /**
     * Write text at cursor position
     * @param {string} text - Text to write
     */
    write(text = '') {
        const cursorSuffix = this.buffer.substring(this.cursorX);
        this.buffer = this.buffer.substring(0, this.cursorX) + text + cursorSuffix;
        this.cursorX += text.length;
    }

    /**
     * Delete character before cursor (backspace)
     */
    deleteBeforeCursor() {
        if (this.cursorX === 0) return;
        const cursorSuffix = this.buffer.substring(this.cursorX);
        this.buffer = this.buffer.substring(0, this.cursorX - 1) + cursorSuffix;
        this.cursorX--;
    }

    /**
     * Delete character at cursor (delete)
     */
    deleteAtCursor() {
        if (this.cursorX >= this.buffer.length) return;
        const cursorSuffix = this.buffer.substring(this.cursorX + 1);
        this.buffer = this.buffer.substring(0, this.cursorX) + cursorSuffix;
    }

    /**
     * Move cursor to start
     */
    cursorToStart() {
        this.cursorX = 0;
    }

    /**
     * Move cursor to end
     */
    cursorToEnd() {
        this.cursorX = this.buffer.length;
    }

    /**
     * Move cursor left
     */
    cursorLeft() {
        if (this.cursorX > 0) this.cursorX--;
    }

    /**
     * Move cursor right
     */
    cursorRight() {
        if (this.cursorX < this.buffer.length) this.cursorX++;
    }

    /**
     * Clear and reset the input buffer
     */
    reset() {
        this.buffer = '';
        this.cursorX = 0;
    }

    /**
     * Get the current buffer content
     * @returns {string} The buffer content
     */
    getContent() {
        return this.buffer;
    }

    /**
     * Get the current cursor position
     * @returns {number} The cursor position
     */
    getCursorX() {
        return this.cursorX;
    }
}

/**
 * @class KeyboardHandler
 * @description Handles keyboard input events
 */
class KeyboardHandler {
    /**
     * @param {Terminal} terminal - The terminal instance
     */
    constructor(terminal) {
        this.terminal = terminal;
    }

    /**
     * Attach keyboard event listener
     * @param {HTMLElement} element - Element to attach listener to
     */
    attach(element) {
        element.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Handle keydown event
     * @param {KeyboardEvent} e - The keyboard event
     */
    async handleKeyDown(e) {
        e.preventDefault();

        try {
            if (e.key === "Enter") {
                await this.terminal.executeCommand();
            } else if (e.key === "c" && e.ctrlKey) {
                this.terminal.interrupt();
            } else if (e.key === "Backspace") {
                this.terminal.deleteInputBeforeCursor();
            } else if (e.key === "Delete") {
                this.terminal.deleteInputAtCursor();
            } else if (e.key === "ArrowLeft") {
                this.terminal.moveCursorLeft();
            } else if (e.key === "ArrowRight") {
                this.terminal.moveCursorRight();
            } else if (e.key === "Home") {
                this.terminal.moveCursorStart();
            } else if (e.key === "End") {
                this.terminal.moveCursorEnd();
            } else if (e.key === "ArrowUp") {
                this.terminal.scrollHistoryPrevious();
            } else if (e.key === "ArrowDown") {
                this.terminal.scrollHistoryNext();
            } else if (e.key.length === 1) {
                this.terminal.writeInputAtCursor(e.key);
            }
        } catch (error) {
            console.error('Keyboard handler error:', error);
        }
    }
}

/**
 * @class Command
 * @description Represents a terminal command with metadata
 */
class Command {
    /**
     * @param {Function} func - The async function to execute
     */
    constructor(func) {
        this.func = func;
        this.summary = '';
        this.help = '';
        this.hidden = false;
    }

    /**
     * Set the command function
     * @param {Function} func - The async function
     * @returns {Command} This instance for chaining
     */
    withFunc(func) {
        this.func = func;
        return this;
    }

    /**
     * Set the command summary
     * @param {string} summary - Short description
     * @returns {Command} This instance for chaining
     */
    withSummary(summary) {
        this.summary = summary;
        return this;
    }

    /**
     * Set the command help text
     * @param {string} help - Detailed help text
     * @returns {Command} This instance for chaining
     */
    withHelp(help) {
        this.help = help;
        return this;
    }

    /**
     * Mark command as hidden from help
     * @returns {Command} This instance for chaining
     */
    markHidden() {
        this.hidden = true;
        return this;
    }

    /**
     * Get the help text
     * @returns {string} The help text
     */
    getHelp() {
        return this.help;
    }

    /**
     * Get the summary text
     * @returns {string} The summary text
     */
    getSummary() {
        return this.summary;
    }

    /**
     * Check if command is hidden
     * @returns {boolean} Whether the command is hidden
     */
    isHidden() {
        return this.hidden;
    }

    /**
     * Execute the command
     * @param {Object} cmd - The command output interface
     * @param {...any} args - Command arguments
     * @returns {Promise<number>} The exit code
     */
    async execute(cmd, ...args) {
        try {
            return await this.func(cmd, ...args);
        } catch (error) {
            console.error('Command execution error:', error);
            cmd.stdErr(`Error executing command: ${error.message}\n`);
            return 1;
        }
    }
}

/**
 * @class Terminal
 * @description Main terminal emulator class
 */
class Terminal {
    /**
     * @param {HTMLElement} terminalElement - The terminal DOM element
     */
    constructor(terminalElement) {
        this.renderer = new Renderer(terminalElement, 'lee.io\u00A0>\u00A0');
        this.inputBuffer = new InputBuffer();
        this.keyboardHandler = new KeyboardHandler(this);

        this.output = '';
        this.history = [];
        this.historyScrollPos = 0;
        this.historyLimit = 100;
        this.commands = {};
        this.variables = {};
        this.lastExitCode = 0;
    }

    /**
     * Add a command to the terminal
     * @param {string} name - Command name
     * @param {Command} command - Command instance
     * @returns {Terminal} This instance for chaining
     */
    withCommand(name, command) {
        if (!this.commandExists(name)) {
            this.commands[name] = command;
        }
        return this;
    }

    /**
     * Check if a command exists
     * @param {string} name - Command name
     * @returns {boolean} Whether the command exists
     */
    commandExists(name) {
        return name in this.commands;
    }

    /**
     * Get a command by name
     * @param {string} name - Command name
     * @returns {Command|undefined} The command or undefined
     */
    getCommand(name) {
        return this.commands[name];
    }

    /**
     * Get all commands
     * @returns {Object} All commands
     */
    getCommands() {
        return this.commands;
    }

    /**
     * Write text at cursor position
     * @param {string} text - Text to write
     */
    writeInputAtCursor(text = '') {
        this.inputBuffer.write(text);
        this.render();
    }

    /**
     * Delete character before cursor
     */
    deleteInputBeforeCursor() {
        this.inputBuffer.deleteBeforeCursor();
        this.render();
    }

    /**
     * Delete character at cursor
     */
    deleteInputAtCursor() {
        this.inputBuffer.deleteAtCursor();
        this.render();
    }

    /**
     * Move cursor to start
     */
    moveCursorStart() {
        this.inputBuffer.cursorToStart();
        this.render();
    }

    /**
     * Move cursor to end
     */
    moveCursorEnd() {
        this.inputBuffer.cursorToEnd();
        this.render();
    }

    /**
     * Move cursor left
     */
    moveCursorLeft() {
        this.inputBuffer.cursorLeft();
        this.render();
    }

    /**
     * Move cursor right
     */
    moveCursorRight() {
        this.inputBuffer.cursorRight();
        this.render();
    }

    /**
     * Scroll history backward (up arrow)
     */
    scrollHistoryPrevious() {
        if (this.history.length > 0) {
            if (this.historyScrollPos < this.history.length) {
                this.historyScrollPos++;
            }
            this.inputBuffer.reset();
            this.inputBuffer.write(this.history[this.historyScrollPos - 1]);
            this.render();
        }
    }

    /**
     * Scroll history forward (down arrow)
     */
    scrollHistoryNext() {
        if (this.history.length > 0 && this.historyScrollPos > 0) {
            this.historyScrollPos--;
            this.inputBuffer.reset();
            if (this.historyScrollPos > 0) {
                this.inputBuffer.write(this.history[this.historyScrollPos - 1]);
            }
            this.render();
        }
    }

    /**
     * Show the prompt
     */
    showPrompt() {
        this.historyScrollPos = 0;
        this.inputBuffer.reset();
        this.render();
    }

    /**
     * Create the command output interface
     * @returns {Object} Object with stdOut and stdErr methods
     */
    createCommandOutput() {
        return {
            stdOut: (text) => {
                this.output += text;
                this.render();
            },
            stdErr: (text) => {
                this.output += text;
                this.render();
            }
        };
    }

    /**
     * Expand built-in shell-like variables in raw input
     * @param {string} input - Raw command input
     * @returns {string} Input with variables expanded
     */
    expandVariables(input = "") {
        const withExitCode = input.replace(/\$\?/g, String(this.lastExitCode));
        return withExitCode.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, bracedName, simpleName) => {
            const name = bracedName || simpleName;
            return this.variables[name] ?? "";
        });
    }

    /**
     * Parse assignment token in NAME=value form
     * @param {string} token - Token to parse
     * @returns {{name: string, value: string}|undefined} Parsed assignment or undefined
     */
    parseAssignmentToken(token) {
        const match = token.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
            return undefined;
        }

        return {
            name: match[1],
            value: match[2]
        };
    }

    /**
     * Execute the current input as a command
     */
    async executeCommand() {
        const inputBuffer = this.inputBuffer.getContent();
        this.output += this.renderer.promptPrefix + inputBuffer + "\n";

        if (inputBuffer.length > 0) {
            // Add to history
            if (this.history.length >= this.historyLimit) {
                this.history.pop();
            }
            this.history.unshift(inputBuffer);

            // Parse command and arguments
            const expandedInput = this.expandVariables(inputBuffer);
            const parts = expandedInput.trim().split(/\s+/).filter(Boolean);

            // Process leading NAME=value assignments
            while (parts.length > 0) {
                const assignment = this.parseAssignmentToken(parts[0]);
                if (!assignment) {
                    break;
                }

                this.variables[assignment.name] = assignment.value;
                parts.shift();
            }

            // Assignment-only input succeeds without running a command
            if (parts.length === 0) {
                this.lastExitCode = 0;
                this.showPrompt();
                return;
            }

            const commandName = parts.shift();

            this.render();

            try {
                if (this.commandExists(commandName)) {
                    const command = this.getCommand(commandName);
                    this.lastExitCode = await command.execute(this.createCommandOutput(), ...parts);
                } else {
                    this.output += `${commandName}: command not found\n`;
                    this.lastExitCode = 127;
                    this.render();
                }
            } catch (error) {
                console.error('Command execution error:', error);
                this.output += `Error: ${error.message}\n`;
                this.lastExitCode = 1;
                this.render();
            }
        }

        this.showPrompt();
    }

    /**
     * Handle Ctrl+C interrupt
     */
    interrupt() {
        const inputBuffer = this.inputBuffer.getContent();
        this.output += this.renderer.promptPrefix + inputBuffer + "\n";
        this.showPrompt();
    }

    /**
     * Render the terminal
     */
    render() {
        this.renderer.render(
            this.output,
            this.inputBuffer.getContent(),
            this.inputBuffer.getCursorX()
        );
    }

    /**
     * Initialize internal commands
     */
    initializeInternalCommands() {
        this.withCommand("help", new Command(async (cmd, name) => {
            try {
                if (name !== undefined && name !== "") {
                    if (!this.commandExists(name)) {
                        cmd.stdErr(`No help entry for '${name}'\n`);
                        return 1;
                    }
                    cmd.stdOut(this.getCommand(name).getHelp() + "\n");
                    return 0;
                }

                const commands = this.getCommands();
                let maxLength = 10;
                for (const commandName in commands) {
                    if (commandName.length > maxLength) {
                        maxLength = commandName.length;
                    }
                }

                let output = "Commands:\n";
                for (const commandName in commands) {
                    const command = this.getCommand(commandName);
                    if (!command.isHidden()) {
                        const summary = command.getSummary();
                        output += `\n${commandName.padEnd(maxLength, ' ')} : ${summary || "N/A"}`;
                    }
                }

                cmd.stdOut(output + "\n");
                return 0;
            } catch (error) {
                console.error('Help command error:', error);
                cmd.stdErr(`Error: ${error.message}\n`);
                return 1;
            }
        }).withSummary("Prints help page. Use 'help <command>' to display help for a command")
          .withHelp("Shows all available commands or detailed help for a specific command.\n\nUsage: help [command]"));

        this.withCommand("echo", new Command(async (cmd, ...args) => {
            const suppressNewline = args[0] === "-n";
            const output = suppressNewline ? args.slice(1).join(' ') : args.join(' ');
            cmd.stdOut(output + (suppressNewline ? '' : "\n"));
            return 0;
        }).withSummary("Displays a line of text")
            .withHelp("Prints its arguments to standard output.\n\nUsage: echo [-n] [text ...]")
            .markHidden());

        this.withCommand("date", new Command(async (cmd, ...args) => {
            const options = parseArg(args ? args.join(' ') : "");
            const now = new Date();
            cmd.stdOut((options.u === true || options.utc === true ? now.toUTCString() : now.toString()) + "\n");
            return 0;
        }).withSummary("Displays the current date and time")
            .withHelp("Prints the current date and time.\n\nUsage: date [-u|--utc]")
            .markHidden());

        this.withCommand("whoami", new Command(async (cmd) => {
            cmd.stdOut("lee\n");
            return 0;
        }).withSummary("Displays the current user")
            .withHelp("Prints the current username.\n\nUsage: whoami")
            .markHidden());

        this.withCommand("uname", new Command(async (cmd, ...args) => {
            const options = parseArg(args ? args.join(' ') : "");
            const platform = window.navigator.platform || "unknown";
            const appVersion = window.navigator.appVersion || "unknown";

            if (options.a === true) {
                cmd.stdOut(`lee.io ${platform} ${appVersion}\n`);
                return 0;
            }

            cmd.stdOut("lee.io\n");
            return 0;
        }).withSummary("Displays system information")
            .withHelp("Prints basic system information.\n\nUsage: uname [-a]")
            .markHidden());

        this.withCommand("which", new Command(async (cmd, ...args) => {
            if (args.length === 0) {
                cmd.stdErr("Usage: which <command> [command ...]\n");
                return 1;
            }

            let exitCode = 0;
            for (const name of args) {
                if (this.commandExists(name)) {
                    cmd.stdOut(`${name}\n`);
                } else {
                    cmd.stdErr(`${name} not found\n`);
                    exitCode = 1;
                }
            }

            return exitCode;
        }).withSummary("Locates a command")
            .withHelp("Displays whether a command exists in this terminal.\n\nUsage: which <command> [command ...]")
            .markHidden());

        this.withCommand("set", new Command(async (cmd) => {
                const variableNames = Object.keys(this.variables).sort();
                const output = variableNames.map((name) => `${name}=${this.variables[name]}`).join("\n");
                cmd.stdOut((output ? output + "\n" : ""));
                return 0;
        }).withSummary("Displays shell variables")
            .withHelp("Prints all shell variables.\n\nUsage: set")
            .markHidden());

        this.withCommand("unset", new Command(async (cmd, ...args) => {
                if (args.length === 0) {
                        cmd.stdErr("Usage: unset <name> [name ...]\n");
                        return 1;
                }

                for (const name of args) {
                        delete this.variables[name];
                }

                return 0;
        }).withSummary("Unsets shell variables")
            .withHelp("Removes one or more shell variables.\n\nUsage: unset <name> [name ...]")
            .markHidden());

        this.withCommand("history", new Command(async (cmd, ...args) => {
            try {
                const argsParsed = parseArg(args ? args.join(' ') : "");
                if (argsParsed.c === true) {
                    this.history = [];
                    return 0;
                }

                cmd.stdOut(this.history.slice().reverse().join("\n") + "\n");
                return 0;
            } catch (error) {
                console.error('History command error:', error);
                cmd.stdErr(`Error: ${error.message}\n`);
                return 1;
            }
        }).markHidden());

        this.withCommand("clear", new Command(async () => {
            this.output = '';
            this.render();
            return 0;
        }).markHidden());
    }

    /**
     * Start the terminal
     */
    run() {
        this.initializeInternalCommands();
        this.renderer.initialize();
        this.keyboardHandler.attach(this.renderer.getElement());
        this.renderer.focus();
        this.output = `Type 'help' for help\n`;
        this.showPrompt();
    }
}

/**
 * Parse command-line arguments
 * @param {string} argv - Arguments string
 * @returns {Object} Parsed arguments
 * @see {@link https://github.com/tnhu/arg}
 */
function parseArg(argv = "") {
    const result = {};
    let i = 0;
    let item = null;
    for (
        argv = argv.split(/\s*\B[\/-]+([\w-]+)[\s=]*/), i = 1;
        item = argv[i++];
        result[item] = argv[i++] || !0
    );
    return result;
}