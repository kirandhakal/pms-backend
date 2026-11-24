"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatEvent = void 0;
const typeorm_1 = require("typeorm");
let ChatEvent = class ChatEvent {
};
exports.ChatEvent = ChatEvent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("increment", { type: "bigint" }),
    __metadata("design:type", String)
], ChatEvent.prototype, "sequence", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ChatEvent.prototype, "conversationKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "uuid" }),
    __metadata("design:type", String)
], ChatEvent.prototype, "messageId", void 0);
exports.ChatEvent = ChatEvent = __decorate([
    (0, typeorm_1.Entity)("chat_events"),
    (0, typeorm_1.Index)(["conversationKey", "sequence"])
], ChatEvent);
