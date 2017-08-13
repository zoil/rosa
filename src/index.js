import Socket from './socket';

/**
 * @class Rosa
 * @property {Socket} _socket
 */
class Rosa {

	//- Private methods


	//- Public methods

	/**
	 * @param server
	 * @param {{}} options
	 */
	constructor(server, options) {
		this.options = options;
		this._socket = new Socket(server, options);
	}
}

/**
 * @param server
 * @param {{}} options
 * @return Rosa
 */
export default function (server, options) {
	return new Rosa(server, options);
}