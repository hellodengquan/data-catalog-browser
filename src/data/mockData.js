export const categoryTree = [
  {
    id: '1',
    name: '用户行为数据',
    children: [
      {
        id: '1-1',
        name: '电商行为',
        children: [
          { id: '1-1-1', name: '用户购买记录', datasetId: 'ds-001' },
          { id: '1-1-2', name: '商品浏览日志', datasetId: 'ds-002' },
          { id: '1-1-3', name: '购物车数据', datasetId: 'ds-003' }
        ]
      },
      {
        id: '1-2',
        name: '社交行为',
        children: [
          { id: '1-2-1', name: '用户关注关系', datasetId: 'ds-004' },
          { id: '1-2-2', name: '消息发送记录', datasetId: 'ds-005' }
        ]
      }
    ]
  },
  {
    id: '2',
    name: '业务核心数据',
    children: [
      {
        id: '2-1',
        name: '订单数据',
        children: [
          { id: '2-1-1', name: '主订单表', datasetId: 'ds-006' },
          { id: '2-1-2', name: '订单明细表', datasetId: 'ds-007' },
          { id: '2-1-3', name: '退款订单', datasetId: 'ds-008' }
        ]
      },
      {
        id: '2-2',
        name: '商品数据',
        children: [
          { id: '2-2-1', name: '商品基础信息', datasetId: 'ds-009' },
          { id: '2-2-2', name: '商品库存', datasetId: 'ds-010' },
          { id: '2-2-3', name: '商品分类', datasetId: 'ds-011' }
        ]
      },
      {
        id: '2-3',
        name: '用户数据',
        children: [
          { id: '2-3-1', name: '用户基础信息', datasetId: 'ds-012' },
          { id: '2-3-2', name: '用户地址', datasetId: 'ds-013' }
        ]
      }
    ]
  },
  {
    id: '3',
    name: '财务数据',
    children: [
      { id: '3-1', name: '支付流水', datasetId: 'ds-014' },
      { id: '3-2', name: '结算记录', datasetId: 'ds-015' },
      { id: '3-3', name: '发票数据', datasetId: 'ds-016' }
    ]
  },
  {
    id: '4',
    name: '日志监控',
    children: [
      { id: '4-1', name: '系统访问日志', datasetId: 'ds-017' },
      { id: '4-2', name: '错误日志', datasetId: 'ds-018' },
      { id: '4-3', name: '性能监控', datasetId: 'ds-019' }
    ]
  }
]

export const datasets = {
  'ds-001': {
    id: 'ds-001',
    name: '用户购买记录',
    description: '记录用户在平台上的所有购买行为，包括下单时间、金额、商品信息等。用于用户行为分析、推荐系统训练和销售趋势预测。',
    owner: '数据中台团队',
    updateFrequency: '每日',
    dataVolume: '约 5000 万条',
    storageLocation: 'Hive / ods.user_purchase_record',
    createdTime: '2023-01-15',
    updatedTime: '2024-06-10',
    tags: ['用户行为', '交易', '核心数据'],
    fields: [
      { name: 'user_id', type: 'BIGINT', description: '用户唯一标识', nullable: false, sample: '100001' },
      { name: 'order_id', type: 'STRING', description: '订单编号', nullable: false, sample: 'ORD202406010001' },
      { name: 'product_id', type: 'BIGINT', description: '商品ID', nullable: false, sample: '50001' },
      { name: 'purchase_time', type: 'TIMESTAMP', description: '购买时间', nullable: false, sample: '2024-06-01 14:30:00' },
      { name: 'amount', type: 'DECIMAL(10,2)', description: '购买金额', nullable: false, sample: '199.99' },
      { name: 'quantity', type: 'INT', description: '购买数量', nullable: false, sample: '2' },
      { name: 'pay_method', type: 'STRING', description: '支付方式', nullable: true, sample: 'Alipay' },
      { name: 'device_type', type: 'STRING', description: '设备类型', nullable: true, sample: 'iOS' },
      { name: 'channel', type: 'STRING', description: '来源渠道', nullable: true, sample: 'AppStore' }
    ]
  },
  'ds-002': {
    id: 'ds-002',
    name: '商品浏览日志',
    description: '用户浏览商品的行为日志，包含浏览时间、停留时长、页面来源等信息。用于分析用户兴趣偏好，优化商品推荐。',
    owner: '推荐算法团队',
    updateFrequency: '实时',
    dataVolume: '约 2 亿条/日',
    storageLocation: 'Kafka / topic_product_view',
    createdTime: '2023-03-20',
    updatedTime: '2024-06-15',
    tags: ['用户行为', '日志', '实时数据'],
    fields: [
      { name: 'user_id', type: 'BIGINT', description: '用户ID（未登录为0）', nullable: false, sample: '100001' },
      { name: 'product_id', type: 'BIGINT', description: '商品ID', nullable: false, sample: '50001' },
      { name: 'view_time', type: 'TIMESTAMP', description: '浏览时间', nullable: false, sample: '2024-06-15 09:15:30' },
      { name: 'duration', type: 'INT', description: '停留时长（秒）', nullable: true, sample: '45' },
      { name: 'referrer', type: 'STRING', description: '来源页面', nullable: true, sample: 'search_result' },
      { name: 'ip', type: 'STRING', description: '访问IP', nullable: true, sample: '192.168.1.1' },
      { name: 'user_agent', type: 'STRING', description: '浏览器UA', nullable: true, sample: 'Chrome/125.0.0.0' }
    ]
  },
  'ds-003': {
    id: 'ds-003',
    name: '购物车数据',
    description: '用户购物车中的商品信息，包括添加时间、商品数量、是否结算等状态。用于分析购物车转化率和用户购买意向。',
    owner: '交易平台团队',
    updateFrequency: '每小时',
    dataVolume: '约 800 万条',
    storageLocation: 'MySQL / cart_db.cart_items',
    createdTime: '2022-11-10',
    updatedTime: '2024-06-14',
    tags: ['交易', '用户行为'],
    fields: [
      { name: 'cart_id', type: 'BIGINT', description: '购物车记录ID', nullable: false, sample: '900001' },
      { name: 'user_id', type: 'BIGINT', description: '用户ID', nullable: false, sample: '100001' },
      { name: 'product_id', type: 'BIGINT', description: '商品ID', nullable: false, sample: '50001' },
      { name: 'quantity', type: 'INT', description: '商品数量', nullable: false, sample: '1' },
      { name: 'add_time', type: 'TIMESTAMP', description: '添加时间', nullable: false, sample: '2024-06-10 16:20:00' },
      { name: 'is_checked', type: 'TINYINT', description: '是否勾选', nullable: false, sample: '1' },
      { name: 'is_deleted', type: 'TINYINT', description: '是否删除', nullable: false, sample: '0' }
    ]
  },
  'ds-004': {
    id: 'ds-004',
    name: '用户关注关系',
    description: '用户之间的关注关系数据，用于社交网络分析、好友推荐等场景。',
    owner: '社交产品团队',
    updateFrequency: '每日',
    dataVolume: '约 1.2 亿条',
    storageLocation: 'HBase / user_follow',
    createdTime: '2023-05-01',
    updatedTime: '2024-06-15',
    tags: ['社交', '用户关系'],
    fields: [
      { name: 'follower_id', type: 'BIGINT', description: '关注者用户ID', nullable: false, sample: '100001' },
      { name: 'following_id', type: 'BIGINT', description: '被关注者用户ID', nullable: false, sample: '200001' },
      { name: 'follow_time', type: 'TIMESTAMP', description: '关注时间', nullable: false, sample: '2024-06-01 12:00:00' },
      { name: 'status', type: 'TINYINT', description: '状态：1-正常 0-取消关注', nullable: false, sample: '1' },
      { name: 'source', type: 'STRING', description: '关注来源', nullable: true, sample: 'recommendation' }
    ]
  },
  'ds-005': {
    id: 'ds-005',
    name: '消息发送记录',
    description: '用户之间的私信发送记录，用于消息投递状态追踪和风控分析。',
    owner: '即时通讯团队',
    updateFrequency: '实时',
    dataVolume: '约 5000 万条/日',
    storageLocation: 'MongoDB / messages',
    createdTime: '2023-02-14',
    updatedTime: '2024-06-15',
    tags: ['社交', '消息', '实时数据'],
    fields: [
      { name: 'msg_id', type: 'STRING', description: '消息唯一ID', nullable: false, sample: 'MSG_abc123xyz' },
      { name: 'sender_id', type: 'BIGINT', description: '发送方ID', nullable: false, sample: '100001' },
      { name: 'receiver_id', type: 'BIGINT', description: '接收方ID', nullable: false, sample: '200001' },
      { name: 'content', type: 'STRING', description: '消息内容', nullable: false, sample: '你好，请问这个商品还有货吗？' },
      { name: 'send_time', type: 'TIMESTAMP', description: '发送时间', nullable: false, sample: '2024-06-15 10:30:00' },
      { name: 'is_read', type: 'TINYINT', description: '是否已读', nullable: false, sample: '0' },
      { name: 'msg_type', type: 'STRING', description: '消息类型', nullable: false, sample: 'text' }
    ]
  },
  'ds-006': {
    id: 'ds-006',
    name: '主订单表',
    description: '订单主表，记录订单的核心信息，包括订单状态、金额、收货人等。是交易系统的核心数据表。',
    owner: '交易平台团队',
    updateFrequency: '实时',
    dataVolume: '约 3000 万条',
    storageLocation: 'MySQL / order_db.order_main',
    createdTime: '2020-01-01',
    updatedTime: '2024-06-15',
    tags: ['核心数据', '交易', '订单'],
    fields: [
      { name: 'order_id', type: 'STRING', description: '订单编号', nullable: false, sample: 'ORD202406010001' },
      { name: 'user_id', type: 'BIGINT', description: '下单用户ID', nullable: false, sample: '100001' },
      { name: 'total_amount', type: 'DECIMAL(12,2)', description: '订单总金额', nullable: false, sample: '599.97' },
      { name: 'pay_amount', type: 'DECIMAL(12,2)', description: '实付金额', nullable: false, sample: '549.97' },
      { name: 'order_status', type: 'TINYINT', description: '订单状态：0待付款1待发货2已发货3已完成4已取消', nullable: false, sample: '3' },
      { name: 'create_time', type: 'TIMESTAMP', description: '下单时间', nullable: false, sample: '2024-06-01 14:30:00' },
      { name: 'pay_time', type: 'TIMESTAMP', description: '支付时间', nullable: true, sample: '2024-06-01 14:35:00' },
      { name: 'consignee', type: 'STRING', description: '收货人姓名', nullable: false, sample: '张三' },
      { name: 'mobile', type: 'STRING', description: '收货人手机号', nullable: false, sample: '138****8888' }
    ]
  },
  'ds-007': {
    id: 'ds-007',
    name: '订单明细表',
    description: '订单明细表，记录订单中每个商品的详细信息，与主订单表通过 order_id 关联。',
    owner: '交易平台团队',
    updateFrequency: '实时',
    dataVolume: '约 8000 万条',
    storageLocation: 'MySQL / order_db.order_detail',
    createdTime: '2020-01-01',
    updatedTime: '2024-06-15',
    tags: ['核心数据', '交易', '订单'],
    fields: [
      { name: 'detail_id', type: 'BIGINT', description: '明细ID', nullable: false, sample: '8000001' },
      { name: 'order_id', type: 'STRING', description: '订单编号', nullable: false, sample: 'ORD202406010001' },
      { name: 'product_id', type: 'BIGINT', description: '商品ID', nullable: false, sample: '50001' },
      { name: 'product_name', type: 'STRING', description: '商品名称快照', nullable: false, sample: 'iPhone 15 Pro 256GB' },
      { name: 'price', type: 'DECIMAL(10,2)', description: '商品单价', nullable: false, sample: '7999.00' },
      { name: 'quantity', type: 'INT', description: '购买数量', nullable: false, sample: '1' },
      { name: 'subtotal', type: 'DECIMAL(12,2)', description: '小计金额', nullable: false, sample: '7999.00' },
      { name: 'discount_amount', type: 'DECIMAL(10,2)', description: '优惠金额', nullable: true, sample: '500.00' }
    ]
  },
  'ds-008': {
    id: 'ds-008',
    name: '退款订单',
    description: '退款订单记录表，记录所有退款申请的详细信息和处理状态。',
    owner: '售后团队',
    updateFrequency: '实时',
    dataVolume: '约 200 万条',
    storageLocation: 'MySQL / after_sales.refund_order',
    createdTime: '2021-06-15',
    updatedTime: '2024-06-14',
    tags: ['交易', '售后', '退款'],
    fields: [
      { name: 'refund_id', type: 'STRING', description: '退款单号', nullable: false, sample: 'REF20240610001' },
      { name: 'order_id', type: 'STRING', description: '原订单号', nullable: false, sample: 'ORD202406010001' },
      { name: 'user_id', type: 'BIGINT', description: '申请人ID', nullable: false, sample: '100001' },
      { name: 'refund_amount', type: 'DECIMAL(12,2)', description: '退款金额', nullable: false, sample: '7999.00' },
      { name: 'refund_reason', type: 'STRING', description: '退款原因', nullable: false, sample: '商品质量问题' },
      { name: 'refund_status', type: 'TINYINT', description: '退款状态：0待处理1处理中2已完成3已拒绝', nullable: false, sample: '2' },
      { name: 'apply_time', type: 'TIMESTAMP', description: '申请时间', nullable: false, sample: '2024-06-10 09:00:00' },
      { name: 'complete_time', type: 'TIMESTAMP', description: '完成时间', nullable: true, sample: '2024-06-11 15:30:00' }
    ]
  },
  'ds-009': {
    id: 'ds-009',
    name: '商品基础信息',
    description: '商品基础信息表，记录商品的核心属性，是商品中心的主数据表。',
    owner: '商品中心团队',
    updateFrequency: '每小时',
    dataVolume: '约 500 万条',
    storageLocation: 'MySQL / product_db.product_info',
    createdTime: '2020-01-01',
    updatedTime: '2024-06-15',
    tags: ['核心数据', '商品'],
    fields: [
      { name: 'product_id', type: 'BIGINT', description: '商品ID', nullable: false, sample: '50001' },
      { name: 'product_name', type: 'STRING', description: '商品名称', nullable: false, sample: 'iPhone 15 Pro 256GB 原色钛金属' },
      { name: 'category_id', type: 'BIGINT', description: '分类ID', nullable: false, sample: '1001' },
      { name: 'brand_id', type: 'BIGINT', description: '品牌ID', nullable: false, sample: '2001' },
      { name: 'price', type: 'DECIMAL(10,2)', description: '售价', nullable: false, sample: '7999.00' },
      { name: 'market_price', type: 'DECIMAL(10,2)', description: '市场价', nullable: true, sample: '8999.00' },
      { name: 'description', type: 'TEXT', description: '商品描述', nullable: true, sample: 'A17 Pro芯片，钛金属设计...' },
      { name: 'main_image', type: 'STRING', description: '主图URL', nullable: true, sample: 'https://.../img1.jpg' },
      { name: 'status', type: 'TINYINT', description: '状态：0下架1上架', nullable: false, sample: '1' },
      { name: 'create_time', type: 'TIMESTAMP', description: '创建时间', nullable: false, sample: '2023-09-22 10:00:00' }
    ]
  },
  'ds-010': {
    id: 'ds-010',
    name: '商品库存',
    description: '商品库存信息表，记录各仓库的商品库存数量和锁定状态。',
    owner: '仓储物流团队',
    updateFrequency: '实时',
    dataVolume: '约 1200 万条',
    storageLocation: 'MySQL / wms_db.inventory',
    createdTime: '2020-03-10',
    updatedTime: '2024-06-15',
    tags: ['商品', '仓储', '库存'],
    fields: [
      { name: 'inventory_id', type: 'BIGINT', description: '库存记录ID', nullable: false, sample: '700001' },
      { name: 'product_id', type: 'BIGINT', description: '商品ID', nullable: false, sample: '50001' },
      { name: 'warehouse_id', type: 'BIGINT', description: '仓库ID', nullable: false, sample: '3001' },
      { name: 'stock_quantity', type: 'INT', description: '库存数量', nullable: false, sample: '250' },
      { name: 'lock_quantity', type: 'INT', description: '锁定数量', nullable: false, sample: '15' },
      { name: 'available_quantity', type: 'INT', description: '可用数量', nullable: false, sample: '235' },
      { name: 'update_time', type: 'TIMESTAMP', description: '更新时间', nullable: false, sample: '2024-06-15 11:00:00' }
    ]
  },
  'ds-011': {
    id: 'ds-011',
    name: '商品分类',
    description: '商品分类信息表，维护商品的分类树结构。',
    owner: '商品中心团队',
    updateFrequency: '每日',
    dataVolume: '约 5000 条',
    storageLocation: 'MySQL / product_db.category',
    createdTime: '2020-01-01',
    updatedTime: '2024-05-20',
    tags: ['商品', '基础数据'],
    fields: [
      { name: 'category_id', type: 'BIGINT', description: '分类ID', nullable: false, sample: '1001' },
      { name: 'category_name', type: 'STRING', description: '分类名称', nullable: false, sample: '手机通讯' },
      { name: 'parent_id', type: 'BIGINT', description: '父分类ID，根节点为0', nullable: false, sample: '100' },
      { name: 'level', type: 'TINYINT', description: '分类层级', nullable: false, sample: '2' },
      { name: 'sort_order', type: 'INT', description: '排序权重', nullable: false, sample: '10' },
      { name: 'is_active', type: 'TINYINT', description: '是否启用', nullable: false, sample: '1' }
    ]
  },
  'ds-012': {
    id: 'ds-012',
    name: '用户基础信息',
    description: '用户基础信息表，记录用户的核心账号信息。包含敏感信息，访问需审批。',
    owner: '用户中心团队',
    updateFrequency: '实时',
    dataVolume: '约 5000 万条',
    storageLocation: 'MySQL / user_db.user_info',
    createdTime: '2019-01-01',
    updatedTime: '2024-06-15',
    tags: ['核心数据', '用户', '敏感数据'],
    fields: [
      { name: 'user_id', type: 'BIGINT', description: '用户ID', nullable: false, sample: '100001' },
      { name: 'username', type: 'STRING', description: '用户名', nullable: false, sample: 'zhangsan' },
      { name: 'nickname', type: 'STRING', description: '昵称', nullable: true, sample: '张三' },
      { name: 'mobile', type: 'STRING', description: '手机号（加密存储）', nullable: false, sample: '****' },
      { name: 'email', type: 'STRING', description: '邮箱（加密存储）', nullable: true, sample: '****' },
      { name: 'gender', type: 'TINYINT', description: '性别：0未知1男2女', nullable: true, sample: '1' },
      { name: 'birthday', type: 'DATE', description: '生日', nullable: true, sample: '1990-01-01' },
      { name: 'register_time', type: 'TIMESTAMP', description: '注册时间', nullable: false, sample: '2023-01-15 10:30:00' },
      { name: 'user_level', type: 'TINYINT', description: '用户等级：1普通2银卡3金卡4钻石', nullable: false, sample: '3' },
      { name: 'status', type: 'TINYINT', description: '状态：0禁用1正常', nullable: false, sample: '1' }
    ]
  },
  'ds-013': {
    id: 'ds-013',
    name: '用户地址',
    description: '用户收货地址信息表，记录用户保存的收货地址。',
    owner: '用户中心团队',
    updateFrequency: '实时',
    dataVolume: '约 8000 万条',
    storageLocation: 'MySQL / user_db.user_address',
    createdTime: '2019-06-01',
    updatedTime: '2024-06-14',
    tags: ['用户', '敏感数据'],
    fields: [
      { name: 'address_id', type: 'BIGINT', description: '地址ID', nullable: false, sample: '600001' },
      { name: 'user_id', type: 'BIGINT', description: '用户ID', nullable: false, sample: '100001' },
      { name: 'consignee', type: 'STRING', description: '收货人', nullable: false, sample: '张三' },
      { name: 'mobile', type: 'STRING', description: '联系电话', nullable: false, sample: '138****8888' },
      { name: 'province', type: 'STRING', description: '省份', nullable: false, sample: '浙江省' },
      { name: 'city', type: 'STRING', description: '城市', nullable: false, sample: '杭州市' },
      { name: 'district', type: 'STRING', description: '区县', nullable: false, sample: '西湖区' },
      { name: 'detail_address', type: 'STRING', description: '详细地址', nullable: false, sample: '文一西路969号' },
      { name: 'is_default', type: 'TINYINT', description: '是否默认地址', nullable: false, sample: '1' }
    ]
  },
  'ds-014': {
    id: 'ds-014',
    name: '支付流水',
    description: '支付流水表，记录所有支付操作的详细信息，包括支付方式、金额、状态等。',
    owner: '财务支付团队',
    updateFrequency: '实时',
    dataVolume: '约 3500 万条',
    storageLocation: 'MySQL / finance_db.payment_transaction',
    createdTime: '2019-03-01',
    updatedTime: '2024-06-15',
    tags: ['核心数据', '财务', '支付'],
    fields: [
      { name: 'pay_id', type: 'STRING', description: '支付流水号', nullable: false, sample: 'PAY2024060100001' },
      { name: 'order_id', type: 'STRING', description: '业务订单号', nullable: false, sample: 'ORD202406010001' },
      { name: 'user_id', type: 'BIGINT', description: '支付用户ID', nullable: false, sample: '100001' },
      { name: 'amount', type: 'DECIMAL(12,2)', description: '支付金额', nullable: false, sample: '7999.00' },
      { name: 'pay_method', type: 'STRING', description: '支付方式：Alipay/Wechat/UnionPay', nullable: false, sample: 'Alipay' },
      { name: 'pay_channel', type: 'STRING', description: '支付渠道', nullable: true, sample: 'APP' },
      { name: 'pay_status', type: 'TINYINT', description: '支付状态：0待支付1支付中2支付成功3支付失败', nullable: false, sample: '2' },
      { name: 'create_time', type: 'TIMESTAMP', description: '创建时间', nullable: false, sample: '2024-06-01 14:30:00' },
      { name: 'success_time', type: 'TIMESTAMP', description: '支付成功时间', nullable: true, sample: '2024-06-01 14:35:00' },
      { name: 'third_party_trans_id', type: 'STRING', description: '第三方交易号', nullable: true, sample: '20240601123456789' }
    ]
  },
  'ds-015': {
    id: 'ds-015',
    name: '结算记录',
    description: '商家结算记录表，记录平台与商家之间的资金结算明细。',
    owner: '财务结算团队',
    updateFrequency: '每日',
    dataVolume: '约 500 万条',
    storageLocation: 'MySQL / finance_db.settlement',
    createdTime: '2020-01-01',
    updatedTime: '2024-06-14',
    tags: ['财务', '结算'],
    fields: [
      { name: 'settlement_id', type: 'STRING', description: '结算单号', nullable: false, sample: 'SET202406150001' },
      { name: 'merchant_id', type: 'BIGINT', description: '商家ID', nullable: false, sample: '80001' },
      { name: 'settlement_amount', type: 'DECIMAL(14,2)', description: '结算金额', nullable: false, sample: '156800.50' },
      { name: 'order_count', type: 'INT', description: '结算订单数', nullable: false, sample: '1250' },
      { name: 'commission_amount', type: 'DECIMAL(12,2)', description: '平台佣金', nullable: false, sample: '7840.03' },
      { name: 'actual_amount', type: 'DECIMAL(14,2)', description: '实际打款金额', nullable: false, sample: '148960.47' },
      { name: 'settlement_date', type: 'DATE', description: '结算日期', nullable: false, sample: '2024-06-15' },
      { name: 'status', type: 'TINYINT', description: '状态：0待结算1已结算2已打款', nullable: false, sample: '2' }
    ]
  },
  'ds-016': {
    id: 'ds-016',
    name: '发票数据',
    description: '发票信息表，记录用户申请的发票信息和开票状态。',
    owner: '财务税务团队',
    updateFrequency: '每小时',
    dataVolume: '约 1000 万条',
    storageLocation: 'MySQL / finance_db.invoice',
    createdTime: '2021-01-01',
    updatedTime: '2024-06-14',
    tags: ['财务', '发票'],
    fields: [
      { name: 'invoice_id', type: 'STRING', description: '发票ID', nullable: false, sample: 'INV202406010001' },
      { name: 'order_id', type: 'STRING', description: '关联订单号', nullable: false, sample: 'ORD202406010001' },
      { name: 'user_id', type: 'BIGINT', description: '申请人ID', nullable: false, sample: '100001' },
      { name: 'invoice_type', type: 'TINYINT', description: '发票类型：1普通发票2增值税专用发票', nullable: false, sample: '1' },
      { name: 'invoice_title', type: 'STRING', description: '发票抬头', nullable: false, sample: '杭州某某科技有限公司' },
      { name: 'taxpayer_id', type: 'STRING', description: '纳税人识别号', nullable: true, sample: '91330100MA2XXXXX' },
      { name: 'invoice_amount', type: 'DECIMAL(12,2)', description: '开票金额', nullable: false, sample: '7999.00' },
      { name: 'invoice_status', type: 'TINYINT', description: '开票状态：0待开1已开2已作废', nullable: false, sample: '1' },
      { name: 'apply_time', type: 'TIMESTAMP', description: '申请时间', nullable: false, sample: '2024-06-01 15:00:00' }
    ]
  },
  'ds-017': {
    id: 'ds-017',
    name: '系统访问日志',
    description: '系统访问日志表，记录所有用户的页面访问和API调用记录，用于安全审计和行为分析。',
    owner: '基础架构团队',
    updateFrequency: '实时',
    dataVolume: '约 5 亿条/日',
    storageLocation: 'Elasticsearch / access_logs-*',
    createdTime: '2020-01-01',
    updatedTime: '2024-06-15',
    tags: ['日志', '安全', '监控'],
    fields: [
      { name: 'log_id', type: 'STRING', description: '日志唯一ID', nullable: false, sample: 'log_abc123xyz789' },
      { name: 'user_id', type: 'BIGINT', description: '用户ID（未登录为0）', nullable: false, sample: '100001' },
      { name: 'request_url', type: 'STRING', description: '请求URL', nullable: false, sample: '/api/order/list' },
      { name: 'request_method', type: 'STRING', description: '请求方法', nullable: false, sample: 'GET' },
      { name: 'request_time', type: 'TIMESTAMP', description: '请求时间', nullable: false, sample: '2024-06-15 14:30:00.123' },
      { name: 'response_time', type: 'INT', description: '响应耗时（毫秒）', nullable: false, sample: '156' },
      { name: 'status_code', type: 'INT', description: 'HTTP状态码', nullable: false, sample: '200' },
      { name: 'ip', type: 'STRING', description: '客户端IP', nullable: false, sample: '192.168.1.100' },
      { name: 'user_agent', type: 'STRING', description: '用户代理', nullable: true, sample: 'Mozilla/5.0...' },
      { name: 'trace_id', type: 'STRING', description: '链路追踪ID', nullable: true, sample: 'trace-xxx-yyy' }
    ]
  },
  'ds-018': {
    id: 'ds-018',
    name: '错误日志',
    description: '系统错误日志表，记录所有异常和错误信息，用于问题排查和系统稳定性监控。',
    owner: '基础架构团队',
    updateFrequency: '实时',
    dataVolume: '约 100 万条/日',
    storageLocation: 'Elasticsearch / error_logs-*',
    createdTime: '2020-03-15',
    updatedTime: '2024-06-15',
    tags: ['日志', '监控', '错误'],
    fields: [
      { name: 'error_id', type: 'STRING', description: '错误ID', nullable: false, sample: 'err_xyz789abc' },
      { name: 'error_type', type: 'STRING', description: '错误类型', nullable: false, sample: 'NullPointerException' },
      { name: 'error_message', type: 'TEXT', description: '错误信息', nullable: false, sample: 'Cannot invoke method on null object' },
      { name: 'stack_trace', type: 'TEXT', description: '堆栈信息', nullable: true, sample: 'at com.xxx.Service.method(Service.java:123)...' },
      { name: 'service_name', type: 'STRING', description: '服务名称', nullable: false, sample: 'order-service' },
      { name: 'environment', type: 'STRING', description: '环境：prod/test/dev', nullable: false, sample: 'prod' },
      { name: 'occur_time', type: 'TIMESTAMP', description: '发生时间', nullable: false, sample: '2024-06-15 14:35:00.456' },
      { name: 'severity', type: 'STRING', description: '严重级别：ERROR/WARN/INFO', nullable: false, sample: 'ERROR' }
    ]
  },
  'ds-019': {
    id: 'ds-019',
    name: '性能监控',
    description: '系统性能监控数据，记录各服务的CPU、内存、磁盘、网络等指标，用于容量规划和性能优化。',
    owner: '基础架构团队',
    updateFrequency: '每10秒',
    dataVolume: '约 8000 万条/日',
    storageLocation: 'Prometheus + InfluxDB',
    createdTime: '2021-06-01',
    updatedTime: '2024-06-15',
    tags: ['监控', '性能', '运维'],
    fields: [
      { name: 'metric_name', type: 'STRING', description: '指标名称', nullable: false, sample: 'cpu_usage_percent' },
      { name: 'service_name', type: 'STRING', description: '服务名称', nullable: false, sample: 'order-service' },
      { name: 'instance_ip', type: 'STRING', description: '实例IP', nullable: false, sample: '10.0.1.101' },
      { name: 'metric_value', type: 'DOUBLE', description: '指标值', nullable: false, sample: '45.6' },
      { name: 'unit', type: 'STRING', description: '单位', nullable: true, sample: '%' },
      { name: 'timestamp', type: 'TIMESTAMP', description: '采集时间', nullable: false, sample: '2024-06-15 14:30:10' },
      { name: 'tags', type: 'MAP', description: '附加标签', nullable: true, sample: '{"az":"cn-hangzhou-a"}' }
    ]
  }
}
