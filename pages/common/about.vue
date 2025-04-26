<template>
  <view class="about-container">
    <view class="section">
      <view class="logo-box">
        <image class="logo" src="/static/images/logo.png" mode="aspectFit"></image>
      </view>
      <view class="title">关于我们</view>
      <view class="content">
        <text>
          欢迎使用本系统！本系统为医院运送作业子系统，为医疗运送作业提供高效、安全、便捷的数字化解决方案。<br/>
          本系统为本科毕业设计。
        </text>
      </view>
      <view class="divider"></view>
      <view class="info-list">
        <view class="info-row">
          <text class="info-label">产品名称</text>
          <text class="info-value">智慧医疗运送作业子系统</text>
        </view>
        <view class="info-row">
          <text class="info-label">开发者</text>
          <text class="info-value">哈哈·</text>
        </view>
        <view class="info-row">
          <text class="info-label">联系方式</text>
          <text class="info-value">100-100-1000</text>
        </view>
      </view>
      <view class="version">版本号：v1.0.5</view>
    </view>
  </view>
</template>

<script setup>
</script>

<style lang="scss">
.about-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fbff 0%, #f5f5f5 100%);
  .section {
    background: #fff;
    border-radius: 24rpx;
    margin: 40rpx 24rpx 0;
    padding: 48rpx 30rpx 32rpx 30rpx;
    box-shadow: 0 6rpx 32rpx 0 rgba(0, 122, 255, 0.05);

    display: flex;
    flex-direction: column;
    align-items: center;

    .logo-box {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 24rpx;
      .logo {
        width: 140rpx;
        height: 140rpx;
        border-radius: 28rpx;
        box-shadow: 0 2rpx 12rpx #e6f7ff;
        background: #f5f8ff;
      }
    }
    .title {
      text-align: center;
      font-size: 44rpx;
      font-weight: bold;
      margin-bottom: 22rpx;
      letter-spacing: 2rpx;
      color: #007aff;
      text-shadow: 0 1rpx 0 #fff;
    }
    .content {
      font-size: 30rpx;
      color: #666;
      margin-bottom: 32rpx;
      line-height: 1.8;
      text-align: center;
      word-break: break-all;
    }
    .divider {
      width: 90%;
      height: 2rpx;
      background: linear-gradient(90deg, #e6f7ff, #fff, #e6f7ff);
      margin: 0 auto 24rpx auto;
      border-radius: 1rpx;
    }
    .info-list {
      width: 100%;
      margin-bottom: 28rpx;
      .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 30rpx;
        padding: 14rpx 0;
        border-bottom: 1rpx solid #f2f2f2;
        &:last-child { border-bottom: none; }
        .info-label {
          color: #999;
          font-weight: 500;
        }
        .info-value {
          color: #333;
          font-weight: 400;
          text-align: right;
        }
      }
    }
    .version {
      text-align: center;
      color: #bbb;
      font-size: 28rpx;
      margin-top: 14rpx;
      letter-spacing: 1rpx;
    }
  }
}
</style>