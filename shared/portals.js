export const PORTALS = Object.freeze({
  hq: {
    role: 'hq',
    path: '/admin.html',
    title: 'Quản trị trụ sở',
    description: 'Quản lý công ty, danh mục chung và hoạt động toàn hệ thống.',
    icon: '◇',
  },
  warehouse: {
    role: 'warehouse',
    path: '/warehouse.html',
    title: 'Quản lý kho',
    description: 'Theo dõi tồn kho trung tâm và xử lý hàng điều chuyển.',
    icon: '▦',
  },
  manager: {
    role: 'manager',
    path: '/manager.html',
    title: 'Quản lý cửa hàng',
    description: 'Điều hành đơn hàng, nhân viên và hoạt động của cửa hàng.',
    icon: '◫',
  },
  employee: {
    role: 'employee',
    path: '/employee.html',
    title: 'Nhân viên cửa hàng',
    description: 'Lập hóa đơn, xử lý đơn được giao và theo dõi hoa hồng.',
    icon: '◈',
  },
  customer: {
    role: 'customer',
    path: '/shop',
    title: 'Khách hàng',
    description: 'Mua sắm và theo dõi đơn hàng của bạn.',
    icon: '＋',
  },
});
export function portalForPath(path) {
  return Object.values(PORTALS).find((portal) => portal.path === path) || PORTALS.customer;
}
