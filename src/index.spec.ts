import "reflect-metadata";
import * as chai from "chai";
import * as spies from "chai-spies";

chai.config.includeStack = true;
process.env.NODE_ENV = "test";
chai.use(spies);
