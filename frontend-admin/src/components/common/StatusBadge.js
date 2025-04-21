import React from 'react';

/**
 * Component hiển thị trạng thái với màu sắc tương ứng
 * @param {string} status - Trạng thái cần hiển thị
 * @param {string} type - Loại trạng thái (hotel, tour, booking, flight)
 */
const StatusBadge = ({ status, type = 'booking' }) => {
  let className = 'inline-block px-2 py-1 text-xs font-semibold rounded-full ';
  let displayText = status;

  if (type === 'booking') {
    // Trạng thái cho đặt phòng/tour
    switch (status) {
      case 'pending':
        className += 'bg-yellow-100 text-yellow-800';
        displayText = 'Chờ xác nhận';
        break;
      case 'confirmed':
        className += 'bg-green-100 text-green-800';
        displayText = 'Đã xác nhận';
        break;
      case 'canceled':
        className += 'bg-red-100 text-red-800';
        displayText = 'Đã hủy';
        break;
      case 'completed':
        className += 'bg-blue-100 text-blue-800';
        displayText = 'Hoàn thành';
        break;
      default:
        className += 'bg-gray-100 text-gray-800';
    }
  } else if (type === 'hotel' || type === 'tour') {
    // Trạng thái cho khách sạn/tour
    switch (status) {
      case 'active':
        className += 'bg-green-100 text-green-800';
        displayText = 'Đang hoạt động';
        break;
      case 'inactive':
        className += 'bg-gray-100 text-gray-800';
        displayText = 'Không hoạt động';
        break;
      case 'featured':
        className += 'bg-purple-100 text-purple-800';
        displayText = 'Nổi bật';
        break;
      default:
        className += 'bg-gray-100 text-gray-800';
    }
  } else if (type === 'flight') {
    // Trạng thái cho chuyến bay
    switch (status) {
      case 'Đúng giờ':
        className += 'bg-green-100 text-green-800';
        break;
      case 'Trễ':
        className += 'bg-yellow-100 text-yellow-800';
        break;
      case 'Hủy':
        className += 'bg-red-100 text-red-800';
        break;
      case 'Đã bay':
        className += 'bg-blue-100 text-blue-800';
        break;
      default:
        className += 'bg-gray-100 text-gray-800';
    }
  }

  return (
    <span className={className}>
      {displayText}
    </span>
  );
};

export default StatusBadge; 