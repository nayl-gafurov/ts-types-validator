import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import {transformer} from "ts-types-validator"

export default {
  input: 'index.ts',
  output: {
    file: 'bundle.js',
    format: 'cjs'
  },
  plugins: [
    resolve(),
    typescript({ transformers: [service => ({
      before: [ transformer(service.getProgram()) ],
      after: []
    })] })
  ]
};