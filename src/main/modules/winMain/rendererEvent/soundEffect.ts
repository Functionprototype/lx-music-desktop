/**
 * winMain/rendererEvent/soundEffect.ts
 * 音效预设管理模块
 * 负责处理与音效预设相关的渲染进程事件，包括均衡器和卷积预设的获取和保存
 */

import { STORE_NAMES } from '@common/constants' // 导入存储名称常量
import { WIN_MAIN_RENDERER_EVENT_NAME } from '@common/ipcNames' // 导入渲染进程事件名称常量
import { mainOn, mainHandle } from '@common/mainIpc' // 导入主进程IPC通信工具
import getStore from '@main/utils/store' // 导入存储工具

/**
 * 初始化音效预设相关事件处理
 * 注册均衡器和卷积预设的获取和保存事件处理器
 */
export default () => {
  // 获取均衡器预设列表
  mainHandle<LX.SoundEffect.EQPreset[]>(WIN_MAIN_RENDERER_EVENT_NAME.get_sound_effect_eq_preset, async() => {
    // 从存储中获取均衡器预设，如果不存在则返回空数组
    return getStore(STORE_NAMES.SOUND_EFFECT).get('eqPreset') as LX.SoundEffect.EQPreset[] | null ?? []
  })
  
  // 保存均衡器预设列表
  mainOn<LX.SoundEffect.EQPreset[]>(WIN_MAIN_RENDERER_EVENT_NAME.save_sound_effect_eq_preset, ({ params }) => {
    // 将均衡器预设保存到存储中
    getStore(STORE_NAMES.SOUND_EFFECT).set('eqPreset', params)
  })

  // 获取卷积预设列表
  mainHandle<LX.SoundEffect.ConvolutionPreset[]>(WIN_MAIN_RENDERER_EVENT_NAME.get_sound_effect_convolution_preset, async() => {
    // 从存储中获取卷积预设，如果不存在则返回空数组
    return getStore(STORE_NAMES.SOUND_EFFECT).get('convolutionPreset') as LX.SoundEffect.ConvolutionPreset[] | null ?? []
  })
  
  // 保存卷积预设列表
  mainOn<LX.SoundEffect.ConvolutionPreset[]>(WIN_MAIN_RENDERER_EVENT_NAME.save_sound_effect_convolution_preset, ({ params }) => {
    // 将卷积预设保存到存储中
    getStore(STORE_NAMES.SOUND_EFFECT).set('convolutionPreset', params)
  })

  // 音调调整预设功能（已注释，暂未启用）
  // mainHandle<LX.SoundEffect.PitchShifterPreset[]>(WIN_MAIN_RENDERER_EVENT_NAME.get_sound_effect_pitch_shifter_preset, async() => {
  //   return getStore(STORE_NAMES.SOUND_EFFECT).get('pitchShifterPreset') as LX.SoundEffect.PitchShifterPreset[] | null ?? []
  // })
  // mainOn<LX.SoundEffect.PitchShifterPreset[]>(WIN_MAIN_RENDERER_EVENT_NAME.save_sound_effect_pitch_shifter_preset, ({ params }) => {
  //   getStore(STORE_NAMES.SOUND_EFFECT).set('pitchShifterPreset', params)
  // })
}
