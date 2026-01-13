<template>
    <div>
    <input v-show="false" type="file" accept="audio/*" @change="handleFileChange" ref="fileInputRef"/>
    <t-button  @click="triggerFileInput">
      🎵 选择
    </t-button>
    </div>


</template>
<script setup lang="ts">
import { ref } from 'vue';
const props=defineProps({audioUrl:String})
const fileInputRef = ref<HTMLInputElement | null>(null)
const triggerFileInput=()=>{
    fileInputRef.value?.click()
}
const emits= defineEmits(['changeUrl'])
const changeUrl=(url:string)=>{
    emits("changeUrl",url)
}
function handleFileChange(e: Event) {
  //取消 对file对象 url引用
  if(props.audioUrl)
  {
  URL.revokeObjectURL( props.audioUrl);
  }
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    // 创建本地 URL（推荐，性能好）
    console.log(file);
    const url = URL.createObjectURL(file)
    changeUrl(url);
  }
}
</script>
<style lang="css" scoped>


</style>