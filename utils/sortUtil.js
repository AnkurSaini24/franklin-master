exports.compareSysViewCount = function (a, b) {
    return parseInt(b.sys_view_count) - parseInt(a.sys_view_count);
}

exports.compareTasksDate = function (a, b) {

    if (a.fields.created < b.fields.created)
        return 1;
    if (a.fields.created > b.fields.created)
        return -1;
    return 0;
}

exports.compareTitle = function (a, b) {

    if (a.fields.summary.toLowerCase() > b.fields.summary.toLowerCase())
        return 1;
    if (a.fields.summary.toLowerCase() < b.fields.summary.toLowerCase())
        return -1;
    return 0;
}

exports.sortByDate = function (a, b) {
    if (a.finishDate > b.finishDate)
        return 1;
    if (a.finishDate < b.finishDate)
        return -1;
    return 0;
}
