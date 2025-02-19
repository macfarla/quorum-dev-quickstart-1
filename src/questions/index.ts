import { resolve as resolvePath } from "path";
import { readdirSync } from "fs";
import { QuestionTree, AnswerMap } from "./types";
import chalk from "chalk";

const _outputDirQuestion: QuestionTree = {
    name: "outputPath",
    prompt: "Where should we create the config files for this network? Please\n" +
 "choose either an empty directory, or a path to a new directory that does\n" +
    "not yet exist. Default: ./quorum-test-network",
    transformerValidator: (rawInput: string, answers: AnswerMap) => {
        // TODO: add some more checks to make sure that the path is valid
        if (rawInput) {
            answers.outputPath = rawInput;
        } else {
            answers.outputPath = "./quorum-test-network";
        }

        try {
            const files = readdirSync(resolvePath(answers.outputPath));
            if (files.length > 0) {
                console.log(chalk.red(
                    `Whoops! It appears that the directory that you've chosen, ${answers.outputPath as string}\n` +
                    `already contains some files. Please clear the directory before continuing, or choose\n` +
                    `a different one.\n`
                ));
                return _outputDirQuestion;
            }
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (err.code as string === "ENOENT") {
                return undefined;
            } else {
                console.log(chalk.red(
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    `Whoops! There was an error when checking your output directory (${err.code as string}). Please\n` +
                    `choose a different one before proceeding.\n`
                ));
                return _outputDirQuestion;
            }
        }

        // this is a no-op, but it makes the TS compiler happy :-/
        return undefined;
    }
};

const _monitoringQuestion: QuestionTree = {
    name: "monitoring",
    prompt: "Do you wish to enable support for logging with Splunk or ELK (Elasticsearch, Logstash & Kibana)? Default: [1]",
    options: [
      { label: "None", value: "none", nextQuestion: _outputDirQuestion, default: true },
      { label: "Splunk", value: "splunk", nextQuestion: _outputDirQuestion },
      { label: "ELK", value: "elk", nextQuestion: _outputDirQuestion }
    ]
};

const _privacyQuestion: QuestionTree = {
    name: "privacy",
    prompt: "Do you wish to enable support for private transactions? [Y/n]",
};
// have to add this below the definition because of the self reference..
_privacyQuestion.transformerValidator = _getYesNoValidator(_privacyQuestion, _monitoringQuestion, "y");


const _orchestrateQuestion: QuestionTree = {
    name: "orchestrate",
    prompt: "Do you want to try out Codefi Orchestrate? [Y/n]",

    transformerValidator: (rawInput: string, answers: AnswerMap) => {
        const normalizedInput = rawInput.toLowerCase();

        if (!normalizedInput) {
            answers.orchestrate = true;
        } else if (normalizedInput === "y" || normalizedInput === "n") {
            answers.orchestrate = normalizedInput === "y";
        } else {
            console.log(chalk.red("Sorry, but I didn't understand your answer. Please select Y or N,\n" +
                "or just hit enter if you want the default.\n"));
            return _orchestrateQuestion;
        }

        if (answers.orchestrate) {
          return _privacyQuestion;
        } else {
          return _quorumKeyManagerQuestion;
        }
    }
};

const _quorumKeyManagerQuestion: QuestionTree = {
  name: "quorumKeyManager",
  prompt: "Do you want to try out Quorum Key Manager? [Y/n]",

  transformerValidator: (rawInput: string, answers: AnswerMap) => {
    const normalizedInput = rawInput.toLowerCase();

    if (!normalizedInput) {
      answers.quorumKeyManager = true;
    } else if (normalizedInput === "y" || normalizedInput === "n") {
      answers.quorumKeyManager = normalizedInput === "y";
    } else {
      console.log(chalk.red("Sorry, but I didn't understand your answer. Please select Y or N,\n" +
        "or just hit enter if you want the default.\n"));
      return _quorumKeyManagerQuestion;
    }

    return _privacyQuestion;
  }
};

const bannerText = String.raw`
              ___
             / _ \   _   _    ___    _ __   _   _   _ __ ___
            | | | | | | | |  / _ \  | '__| | | | | | '_ ' _ \
            | |_| | | |_| | | (_) | | |    | |_| | | | | | | |
             \__\_\  \__,_|  \___/  |_|     \__,_| |_| |_| |_|

        ____                          _
       |  _ \    ___  __   __   ___  | |   ___    _ __     ___   _ __
       | | | |  / _ \ \ \ / /  / _ \ | |  / _ \  | '_ \   / _ \ | '__|
       | |_| | |  __/  \ V /  |  __/ | | | (_) | | |_) | |  __/ | |
       |____/   \___|   \_/    \___| |_|  \___/  | .__/   \___| |_|
                                                 |_|
       ___            _          _            _                    _
      / _ \   _   _  (_)   ___  | | __  ___  | |_    __ _   _ __  | |_
     | | | | | | | | | |  / __| | |/ / / __| | __|  / _' | | '__| | __|
     | |_| | | |_| | | | | (__  |   <  \__ \ | |_  | (_| | | |    | |_
      \__\_\  \__,_| |_|  \___| |_|\_\ |___/  \__|  \__,_| |_|     \__|
`;

const leadInText = `
\nWelcome to the Quorum Developer Quickstart utility. This tool can be used
to rapidly generate local Quorum blockchain networks for development purposes
using tools like GoQuorum, Besu, and Codefi Orchestrate.

To get started, be sure that you have both Docker and Docker Compose
installed, then answer the following questions.\n\n`;

export const rootQuestion: QuestionTree = {
    name: "clientType",
    prompt: `${bannerText}${leadInText}Which Ethereum client would you like to run? Default: [1]`,
    options: [
        // TODO: fix these to the correct names
        { label: "Hyperledger Besu", value: "besu", nextQuestion: _orchestrateQuestion, default: true },
        { label: "GoQuorum", value: "goquorum", nextQuestion: _orchestrateQuestion }
    ]
};

function _getYesNoValidator(question: QuestionTree, nextQuestion?: QuestionTree, defaultResponse?: "y" | "n" ) {
    return (rawInput: string, answers: AnswerMap) => {
        const normalizedInput = rawInput.toLowerCase();

        if (defaultResponse && !normalizedInput) {
            answers[question.name] = defaultResponse === "y";
            return nextQuestion;
        } else if (normalizedInput === "y" || normalizedInput === "n") {
            answers[question.name] = normalizedInput === "y";
            return nextQuestion;
        } else {
            console.log(chalk.red("Sorry, but I didn't understand your answer. Please select Y or N,\n" +
                "or just hit enter if you want the default.\n"));
            return question;
        }
    };
}
