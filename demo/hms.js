import _ from 'lodash';
import hms from './hms_core.js';

function main() {
  console.log('\n---\n');
  console.log(hms());
}

_.times(10, main);
