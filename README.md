# queryT
> A query text builder that depends upon the available query parameters. queryT.js is small, it has no dependencies and it is inspired by the simplicity and efficiency of the [doT](http://olado.github.io/doT/index.html).

## Tokens

```javascript
queryT.tokens = {
  start: '[[',                          //evaluation start token
  end: ']]',                            //evaluation end token
  separators:[',', 'AND', 'OR']         //a list of separators
};
```

### Parameters

The name of the parameters complies with the MsSql rules for variables. It must begin with an at (@) sign.

### Evaluation

Evaluation consists in checking the availability of the parameters used. An evaluation is passed only if all the parameters are available, regardless sub-evaluations. For example:

```
SELECT * FROM Table
[[WHERE Field1 = @Field1 [[AND Field2 = @Field2]]]]
```

if only the @Field2 is passed then the result will be:

```
SELECT * FROM Table
```

if only the @Field1 is passed then the result will be:

```
SELECT * FROM Table
WHERE Field1 = @Field1
```

if both parameters are passed then the result will be:

```
SELECT * FROM Table
WHERE Field1 = @Field1 AND Field2 = @Field2
```
### Separators

Separators helps composing a correct statement. In an evaluation, each sub-evaluation depends on previous sub-evaluations.
If one of the previous sub-evaluations was significant then the separator should stay, otherwise it will be removed.

`template`

```
SELECT * FROM Table
[[WHERE [[Field1 = @Field1]] [[AND Field2 = @Field2]] [[AND Field3 = @Field3]]]]
```

Suppose the @Field1 parameter is not available, but @Field2 and @Field3 are. The result will be:

```
SELECT * FROM Table
WHERE Field2 = @Field2 AND Field3 = @Field3
```

Notice that the 'AND' separator was removed from ```[[AND Field2 = @Field2]]```, but not from ```[[AND Field3 = @Field3]]```.

## Usage

```javascript
var parameters = ['@Param1', '@Param3'],
    template = 'SELECT * FROM Table [[WHERE [[Field1 = @Param1]] [[AND Field2 = @Param2]] [[AND Field3 = @Param3]]]]',
    options = {
        hasParameter : function(name){
            return parameters.indexOf(name) !== -1;
        },
        rewriteParameter : function(name, index){
            return name;
        }
    };
var result = queryT.template(template, options);
```

### Result

```
SELECT * FROM Table WHERE Field1 = @Param1 AND Field3 = @Param3
```

## Parameters rewriting

Not all sql server have the same notation rule for parameters. For example, in MySql the notation for parameters is '?'.
In this case, the rewriteParameter function should be provided.

```javascript
var parameters = ['@Param1', '@Param3'],
    template = 'SELECT * FROM Table [[WHERE [[Field1 = @Param1]] [[AND Field2 = @Param2]] [[AND Field3 = @Param3]]]]',
    options = {
        hasParameter : function(name){
            return parameters.indexOf(name) !== -1;
        },
        rewriteParameter : function(name, index){
            return '?';
        }
    };
var result = queryT.template(template, options);
```

### Result

```
SELECT * FROM Table WHERE Field1 = ? AND Field3 = ?
```

## Joins

```javascript
var parameters = ['@Param1', '@Param3'],
    template = 'SELECT * FROM Table [[LEFT JOIN Table2 ON Table.Field1 = Table2.Field1 AND Table2.Field2 = @Param2]] [[WHERE [[Table1.Field1 = @Param1]] [[AND Table1.Field2 = @Param3]]]]',
    options = {
        hasParameter : function(name){
            return parameters.indexOf(name) !== -1;
        },
        rewriteParameter : function(name, index){
            return name;
        }
    };
var result = queryT.template(template, options);
```

### Result

```
SELECT * FROM Table WHERE Table1.Field1 = @Param1 AND Table1.Field2 = @Param3
```

## Fields on select clause depending on parameters

For fields, an workaround is needed.

```javascript
var parameters = ['@Param1', '@Param3'],
    template = 'SELECT Table.*[[, Table2.Field2 @Param2Field]] FROM Table [[LEFT JOIN Table2 ON Table.Field1 = Table2.Field1 AND Table2.Field2 = @Param2]] [[WHERE [[Table1.Field1 = @Param1]] [[AND Table1.Field2 = @Param3]]]]',
    options = {
        hasParameter : function(name){
            return (parameters.indexOf(name) >= 0) || (parameters.indexOf(name + 'Field') >= 0);
        },
        rewriteParameter : function(name, index){
            if (name.substr(-5) === 'Field')
                return '';
            return name;
        }
    };
var result = queryT.template(template, options);
```

### Result

```
SELECT Table.* FROM Table WHERE Table1.Field1 = @Param1 AND Table1.Field2 = @Param3
```

## Author
Mihai Slobozeanu

## License
queryT is licensed under the MIT License.
