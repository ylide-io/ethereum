"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumNameService = void 0;
const sdk_1 = require("@ylide/sdk");
class EthereumNameService extends sdk_1.AbstractNameService {
    controller;
    contractAddress;
    constructor(controller, contractAddress) {
        super();
        this.controller = controller;
        this.contractAddress = contractAddress;
    }
    isCandidate(name) {
        return name.toLowerCase().endsWith('.eth');
    }
    resolve(name) {
        return this.controller.executeWeb3Op(w3 => {
            w3.eth.ens.registryAddress = this.contractAddress;
            return w3.eth.ens.getAddress(name);
            // const ens = new ENS({ provider: w3, ensAddress: this.contractAddress });
            // return ens.name(name).getAddress();
        });
    }
    reverseResolve(address) {
        return this.controller.executeWeb3Op(async (w3) => {
            return null;
            // w3.eth.ens.registryAddress = this.contractAddress;
            // return w3.eth.ens.;
            // const ens = new ENS({ provider: w3, ensAddress: this.contractAddress });
            // return (await ens.getName(address)).name;
        });
    }
}
exports.EthereumNameService = EthereumNameService;
//# sourceMappingURL=EthereumNameService.js.map