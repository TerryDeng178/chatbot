// 群聊页面调试脚本
// 用于诊断 WXML 编译错误和运行时问题

console.log('🔍 开始群聊页面调试...')

// 检查关键数据字段
function checkDataFields() {
  console.log('📊 检查数据字段:')
  
  // 检查 newGroupData
  if (typeof newGroupData !== 'undefined') {
    console.log('✅ newGroupData 存在:', newGroupData)
    console.log('✅ initialAIs:', newGroupData.initialAIs)
    console.log('✅ initialAINames:', newGroupData.initialAINames)
  } else {
    console.log('❌ newGroupData 未定义')
  }
  
  // 检查 aiPersonalities
  if (typeof aiPersonalities !== 'undefined') {
    console.log('✅ aiPersonalities 存在:', aiPersonalities)
  } else {
    console.log('❌ aiPersonalities 未定义')
  }
}

// 检查 WXML 绑定
function checkWXMLBindings() {
  console.log('🔗 检查 WXML 绑定:')
  
  // 检查 wx:for 循环
  const initialAIs = [1, 2, 3]
  const initialAINames = ['温情', '智慧', '幽默']
  
  console.log('✅ initialAIs 数组:', initialAIs)
  console.log('✅ initialAINames 数组:', initialAINames)
  
  // 模拟 WXML 循环
  initialAINames.forEach((name, index) => {
    console.log(`✅ 循环 ${index}: ${name}`)
  })
}

// 检查函数定义
function checkFunctions() {
  console.log('⚙️ 检查函数定义:')
  
  const functions = [
    'selectInitialAIs',
    'getAINickname',
    'updateAITags',
    'stopPropagation'
  ]
  
  functions.forEach(funcName => {
    if (typeof this[funcName] === 'function') {
      console.log(`✅ ${funcName} 函数存在`)
    } else {
      console.log(`❌ ${funcName} 函数未定义`)
    }
  })
}

// 运行检查
try {
  checkDataFields()
  checkWXMLBindings()
  checkFunctions()
  console.log('✅ 调试检查完成')
} catch (error) {
  console.error('❌ 调试检查失败:', error)
}

// 导出调试函数
module.exports = {
  checkDataFields,
  checkWXMLBindings,
  checkFunctions
}
