"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPackage = exports.isMarkdown = exports.isPpt = exports.isExcel = exports.isWord = exports.isPdf = exports.isText = exports.isAudio = exports.isVideo = exports.isImage = void 0;
const isImage = (mimetype) => {
    return mimetype.startsWith('image/');
};
exports.isImage = isImage;
const isVideo = (mimetype) => {
    return mimetype.startsWith('video/');
};
exports.isVideo = isVideo;
const isAudio = (mimetype) => {
    return mimetype.startsWith('audio/');
};
exports.isAudio = isAudio;
const isText = (mimetype) => {
    return mimetype.startsWith('text/');
};
exports.isText = isText;
const isPdf = (mimetype) => {
    return mimetype.startsWith('application/pdf') || mimetype.startsWith('application/x-pdf');
};
exports.isPdf = isPdf;
const isWord = (mimetype) => {
    return (mimetype.startsWith('application/msword') ||
        mimetype.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
};
exports.isWord = isWord;
const isExcel = (mimetype) => {
    return (mimetype.startsWith('application/vnd.ms-excel') ||
        mimetype.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ||
        mimetype.startsWith('text/csv') ||
        mimetype.startsWith('application/csv'));
};
exports.isExcel = isExcel;
const isPpt = (mimetype) => {
    return (mimetype.startsWith('application/vnd.ms-powerpoint') ||
        mimetype.startsWith('application/vnd.openxmlformats-officedocument.presentationml.presentation'));
};
exports.isPpt = isPpt;
const isMarkdown = (mimetype) => {
    return mimetype.startsWith('text/markdown');
};
exports.isMarkdown = isMarkdown;
const isPackage = (mimetype) => {
    return mimetype.startsWith('application/zip');
};
exports.isPackage = isPackage;
