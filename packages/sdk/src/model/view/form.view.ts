import { FormViewCore } from '@teable/core';
import { updateViewOptions } from '@teable/openapi';
import { Mixin } from 'ts-mixer';
import { requestWrap } from '../../utils/requestWrap';
import { View } from './view';

export class FormView extends Mixin(FormViewCore, View) {
  async updateOption(options: Record<string, unknown>) {
    return await requestWrap(updateViewOptions)(this.tableId, this.id, {
      options,
    });
  }
}
