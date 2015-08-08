/**
 * Created by mihai on 8/7/2015.
 */

(function () {
    var queryT = {
        tokens: {
            start: '[[',
            end: ']]',
            and: 'AND',
            or: 'OR',
            alternative: {
                start: '{{',
                end: '}}'
            }
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
        var index = 0,
            escaped = "";
        while (index < token.length) {
            escaped += "\\" + token[index++];
        }
        return escaped;
    }

    queryT.template = function (template, options) {
        var options = options || {},
            tokens = options.tokens || this.tokens,
            originalRe = new RegExp(escapeToken(tokens.start) + "([\\s\\S]+?)" + escapeToken(tokens.end), 'g'),
            alternativeRe = new RegExp(escapeToken(tokens.alternative.start) + "([\\s\\S]+?)" + escapeToken(tokens.alternative.end), 'g'),
            alternateRe = new RegExp(escapeToken(tokens.start) + '|' + escapeToken(tokens.end), 'g'),
            logicalOperatorsRe = new RegExp('^(' + tokens.and + '|' + tokens.or + ')', 'gi'),
            parametersRe = /\@([^\!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;\<\=\>\?\@\^\`\{\|\}\-\~\s\']+)/g;
        template = alternate(template, tokens);

        if (typeof options.matchParameter !== "function") {
            options.matchParameter = function (name, index) {
                return name;
            };
        }

        if (typeof options.hasParameter !== "function") {
            options.hasParameter = function (name) {
            };
        }

        function alternate(template) {
            var depth = 0;

            return template.replace(alternateRe, function (match) {
                if (match === tokens.start) {
                    if (depth % 2 === 1) {
                        match = tokens.alternative.start;
                    }
                    depth++;
                } else if (match === tokens.end) {
                    depth--;
                    if (depth % 2 === 1) {
                        match = tokens.alternative.end;
                    }
                }
                return match;
            });
        }

        function stripOriginal(str) {
            var start = tokens.start.length,
                length = str.length - tokens.end.length - start;
            return str.substr(start, length);
        }

        function stripAlternative(str) {
            var start = tokens.alternative.start.length,
                length = str.length - tokens.alternative.end.length - start;
            return str.substr(start, length);
        }

        function replaceOriginal(str) {
            var matched = false,
                previousMatched = false,
                result = str.replace(originalRe, function (match) {
                    match = stripOriginal(match);
                    var response = replaceAlternative(match);
                    if (response.matched) {
                        match = response.result;
                    } else if (!hasParameters(match)) {
                        return '';
                    }
                    if (previousMatched === false) {
                        match = trimLogicalOperators(match);
                    }
                    matched = true;
                    previousMatched = true;
                    return match;
                });
            return {
                matched: matched,
                result: result
            };
        }

        function replaceAlternative(str) {
            var matched = false,
                previousMatched = false,
                result = str.replace(alternativeRe, function (match) {
                    match = stripAlternative(match);
                    var response = replaceOriginal(match);
                    if (response.matched) {
                        match = response.result;
                    } else if (!hasParameters(match)) {
                        return '';
                    }
                    if (previousMatched === false) {
                        match = trimLogicalOperators(match);
                    }
                    matched = true;
                    previousMatched = true;
                    return match;
                });
            return {
                matched: matched,
                result: result
            };
        }

        function trimLogicalOperators(str) {
            return str.replace(logicalOperatorsRe, function (match) {
                return '';
            }).trim();
        }

        function hasParameters(str) {
            var allMatches = 0,
                resolvedMatches = 0;

            str.match(parametersRe).forEach(function (match) {
                allMatches++;
                if (options.hasParameter(match) === true) {
                    resolvedMatches++;
                }
            });
            return resolvedMatches === allMatches;
        }

        function matchParameters(str) {
            var parameterIndex = 0;
            return str.replace(parametersRe, function (match) {
                return options.matchParameter(match, parameterIndex++);
            });
        }

        var response = replaceOriginal(template);
        return matchParameters(response.result);
    }

}());
