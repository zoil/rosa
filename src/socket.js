import socketIO from 'socket.io';
import socketIORedis from 'socket.io-redis';

import * as eventTypes from './event-types';

/**
 * @class Socket
 * @property {socketIO} _io
 * @property {{}} options
 */
export default class Socket {

	//- Private methods

	/**
	 * This is called when a client attempts to connect to us.
	 * @param {socketIO} socket
	 * @param next
	 * @private
	 */
	_use(socket, next) {
		// see whether we need authentication
		if (typeof this.options.tokenValidator === "function") {
			// yes, we have to authenticate clients
			const token = socket.handshake.query.token;
			this.options.tokenValidator(token)
				.then(sessionData => {
					socket.sessionData = sessionData;
					next();
				})
				.catch(error => {
					next(error);
				})
		} else {
			// no authentication required
			next();
		}
	}

	_processSubscribeEvent(socket, payload) {

	}

	_processUnsubscribeEvent(socket, payload) {

	}

	_processUpdateEvent(socket, payload) {

	}

	_processDeleteEvent(socket, payload) {

	}

	_processCreateEvent(socket, payload) {

	}

	_processGetEvent(socket, payload) {

	}

	/**
	 * This is called on successful connection and authentication, if applicable.
	 * @param socket
	 * @private
	 */
	_onConnection(socket) {
		socket.on("disconnect", () => {
			console.log('disconnected', socket.entityId);
		});

		const eventMapping = {
			[eventTypes.EVENT_SUBSCRIBE]: this._processSubscribeEvent,
			[eventTypes.EVENT_UNSUBSCRIBE]: this._processUnsubscribeEvent,
			[eventTypes.EVENT_UPDATE]: this._processUpdateEvent,
			[eventTypes.EVENT_DELETE]: this._processDeleteEvent,
			[eventTypes.EVENT_CREATE]: this._processCreateEvent,
			[eventTypes.EVENT_GET]: this._processGetEvent,
		};
		Object.keys(eventMapping).forEach(eventType => {
			const method = eventMapping[eventType];
			socket.on(eventType, payload => {
				method(socket, payload);
			});
		});
	}

	//- Public methods

	/**
	 * @param server
	 * @param {{
	 * redis: {server: string, port: number}
	 * }} options
	 */
	constructor(server, options) {
		this.options = options;
		this._io = socketIO(server);
		this._io.adapter(socketIORedis(options.redis));
		this._io.use(this._use.bind(this));
		this._io.on("connection", this._onConnection.bind(this));
	}
}