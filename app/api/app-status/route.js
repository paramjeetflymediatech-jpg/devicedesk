import { NextResponse } from 'next/server';
import { isIosDisabled, getIosMaintenanceMessage } from '../../utils/iosBlocker.js';

export async function GET(request) {
  try {
    const disabled = await isIosDisabled();
    return NextResponse.json({
      status: 'ok',
      iosDisabled: disabled,
      message: disabled ? getIosMaintenanceMessage() : null,
      webUrl: 'https://devicedesk.flymediatech.com'
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      iosDisabled: false,
      message: null
    }, { status: 500 });
  }
}
