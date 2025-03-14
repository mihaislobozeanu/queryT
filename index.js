/**
 * Created by mihai on 2015.07.08.
 */

(function () {
    const queryT = {
        tokens: {
            start: '[[',
            end: ']]',
            separators: [',', 'AND', 'OR']
        }
    }, _globals = (function () {
        return this || (0, eval)("this");
    }());

    if (typeof module !== "undefined" && module.exports) {
        module.exports = queryT;
    } else if (typeof define === "function" && define.amd) {
        define(function () {
            return queryT;
        });
    } else {
        _globals.queryT = queryT;
    }

    function escapeToken(token) {
        let index = 0,
            escaped = "";
        while (index < token.length) {
            escaped += "\\" + token[index++];
        }
        return escaped;
    }

    function getSeparatorsExpression(separators) {
        return separators.map(function (s) {
            return escapeToken(s);
        }).join('|');
    };

    String.prototype.replaceAsync = String.prototype.replaceAsync || function (re, callback) {
        const str = this,
            parts = [];
        let i = 0;
        if (Object.prototype.toString.call(re) == "[object RegExp]") {
            if (re.global)
                re.lastIndex = i;
            let m;
            while ((m = re.exec(str)) !== null) {
                const args = m.concat([m.index, m.input]);
                parts.push(str.slice(i, m.index), callback.apply(null, args));
                i = re.lastIndex;
                if (!re.global)
                    break;
                if (m[0].length == 0)
                    re.lastIndex++;
            }
        } else {
            re = String(re);
            i = str.indexOf(re);
            parts.push(str.slice(0, i), callback.apply(null, [re, i, str]));
            i += re.length;
        }
        parts.push(str.slice(i));
        return Promise.all(parts)
            .then((strings) => strings.join(""));
    }

    queryT.template = async function (template, options, callback) {
        const self = this;
        if (!callback && !Function.isFunction(callback)) throw new Error('Missing callback parameter!');
        queryT.templateAsync(template, options).then(result => callback(null, result)).catch(err => callback(err));
    }

    queryT.templateAsync = async function (template, options) {

        options = options || {};

        const tokens = options.tokens || this.tokens,
            separatorsRe = new RegExp('^(' + getSeparatorsExpression(tokens.separators) + ')', 'gi'),
            parametersRe = /\@([^\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\^\`\{\|\}\[\]\-\~\s\']+)/g;

        if (typeof options.rewriteParameter !== "function") {
            options.rewriteParameter = function (name, index) {
                return name;
            };
        }

        if (typeof options.hasParameter !== "function") {
            options.hasParameter = function (name) {
            };
        }

        async function replace(str, tokens, fn) {
            const tokensRe = new RegExp(escapeToken(tokens.start) + '|' + escapeToken(tokens.end), 'g');
            let match, result = '',
                startIndex = 0, endIndex = 0,
                depth = 0;
            while (match = tokensRe.exec(str)) {
                if (depth === 0) {
                    startIndex = match.index;
                    result += str.substring(endIndex, startIndex);
                }
                match[0] === tokens.start && depth++;
                match[0] === tokens.end && depth--;

                if (depth === 0) {
                    endIndex = match.index + tokens.end.length;
                    result += await fn(str.substring(startIndex, endIndex));
                }
            }
            result += str.substring(endIndex);
            return result;
        }

        function stripOriginal(str) {
            const start = tokens.start.length,
                length = str.length - tokens.end.length - start;
            return str.substr(start, length);
        }

        async function replaceOriginal(str) {
            let matched = false,
                previousMatched = false,
                matchesFound = 0;
            const result = await replace(str, tokens, async function (match) {
                matchesFound++;
                const response = await matchParameters(await replaceOriginal(stripOriginal(match)));

                if (!response.matched) {
                    return '';
                }
                match = response.result;
                if (previousMatched === false) {
                    match = trimSeparators(match);
                }
                matched = true;
                previousMatched = true;
                return match;
            });
            return {
                matched: matchesFound === 0 || matched,
                result: result
            };
        }

        function trimSeparators(str) {
            return str.replace(separatorsRe, function (match) {
                return '';
            }).trim();
        }

        async function matchParameters(request) {
            const matches = request.result.match(parametersRe);
            let allMatches = 0,
                resolvedMatches = 0;
            if (matches && matches.length) {
                for (let match of matches) {
                    allMatches++;
                    if (await options.hasParameter(match) === true) {
                        resolvedMatches++;
                    }
                }
                return {
                    matched: (resolvedMatches === allMatches),
                    result: request.result
                }
            }
            return request;
        }

        async function rewriteParameters(str) {
            let parameterIndex = 0;
            return await str.replaceAsync(parametersRe, async function (match) {
                return await options.rewriteParameter(match, parameterIndex++);
            });
        }

        const response = await replaceOriginal(template);
        return await rewriteParameters(response.result);
    }

}());
